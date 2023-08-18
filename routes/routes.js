import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser";
const aroute = express.Router();
import { OAuth2Client } from 'google-auth-library';
import details from "../model/scheme.js";
import { Configuration, OpenAIApi } from "openai";

const app = express();
app.use(cookieParser());
app.use(express.json());
const saltRounds = 10;
const myJWTSecretKey = "Madhan";
aroute.get('/usernames', async (req, res) => {
    try {
      const usernames = await details.find({},'userName');
      const emails = await details.find({},'emailID');
      res.status(200).json({usernames,emails});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
aroute.route('/register').post((req, res, next) => {
    let u=req.body.userName;
    let p=req.body.password;
    bcrypt.genSalt(saltRounds, function (err, salt) {
        bcrypt.hash(req.body.password, salt, function (err, hash) {
            let data = {
                userName: req.body.userName,
                emailID: req.body.emailID,
                password: hash,
                isSub: "False",
                isq: false,
                noTurns: 5,
                attend:false
            }
            details.create(data).then(() => {
                const token = jwt.sign({ u, p }, myJWTSecretKey);
                res.cookie('token', token, { httpOnly: true });
                res.status(200).json({ message: "Registered!",token});
            }).catch((error) => {
                console.log(error);
                res.status(400).json({ message: error });
            });
        });
    });
});

aroute.route('/login').post((req, res, next) => {
    details.find({ userName: req.body.userName }).then((data) => {
        let u = "", p = "";
        data.forEach((item) => {
            u = item.userName,
            p = item.password
        });
        //console.log(p);
        bcrypt.compare(req.body.password, p, function (err, result) {
            if (result) {
                const token = jwt.sign({ u, p }, myJWTSecretKey);
                res.cookie('token', token, { httpOnly: true });
                res.status(200).json({ message: "LoggedIn", token });
                //res.send(status);
            } else {
                res.status(400).json({ error: "Incorrect Username or Password!" });
            }
        });
    }).catch((error) => {
        console.log(error);
    })
});

aroute.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
});

aroute.route('/uquiz').post((req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, (err, decoded) => {
            if (err) {
                res.status(401).json({ message: "Not Valid User" });
            } else {
                let name = "";
                name = decoded.u;
                details.findOneAndUpdate(
                    { userName: name },
                    { $set: { 'uquestions': req.body.questions, 'isq':true,'attend':false}, $inc: {'noTurns':-1} },
                    { returnOriginal: false }
                )
                    .then(updatedDocument => {
                        //console.log(updatedDocument);
                        res.status(200).json({ message: "Data Received And Stored", id: updatedDocument.id });
                    })
                    .catch(error => {
                        console.error(error);
                        res.status(500).json({ message: "Internal Server Error" });
                    });
            }
        });
    } else {
        res.status(401).json({ message: "Not Signed In" });
    }
});

aroute.route('/ques').post((req, res, next) => {
    let link = req.body.link;
    let s = link.slice(-1);
    link = link.slice(0, -1);
    //console.log(link);
    if (s == "1") {
        details.find({ _id: link }).then((data) => {
            data.forEach((item) => {
                res.status(200).json({ message: item.uquestions });
            })
        }).catch((error) => {
            console.log(error);
            res.status(400).json({ message: error });
        })
    } else if (s == "2") {
        details.find({ _id: link }).then((data) => {
            data.forEach((item) => {
                res.status(200).json({ message: item.aiquestions });
            })
        }).catch((error) => {
            console.log(error);
            res.status(400).json({ message: error });
        })
    }
});

aroute.route('/save').post((req, res, next) => {
    let link = req.body.link;
    let s = link.slice(-1);
    link = link.slice(0, -1);
    let n = req.body.d.name;
    let p = req.body.d.points;
    let c = req.body.d.crtAns;
    let i = req.body.d.inAns;
    if (s == "1") {
        details.findOneAndUpdate({ _id: link },
            { $push: { 'sgqusers': { name: n, points: p, crt: c, incrt: i } }, $set: {'attend':true} },
            { returnOriginal: false }).then((data) => {
                //console.log(data);
                res.status(200).json({ message: " Points Updated!" });
            }).catch((error) => {
                console.log(error);
            })
    } else if (s == "2") {
        details.findOneAndUpdate({ _id: link },
            { $set: { 'aiqusers': req.body.d } },
            { returnOriginal: false }).then((data) => {
                res.status(200).json({ message: " Points Updated!" });
            }).catch((error) => {
                console.log(error);
            })
    }
});

aroute.route('/ai').post((req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, async (err, decoded) => {
            if (err) {
                res.status(400).json({ message: "Not Valid User" });
            } else {
                let name = "";
                name = decoded.u;
                console.log(name);
                const configuration = new Configuration({
                    organization: "",
                    apiKey: ""
                });
                const openai = new OpenAIApi(configuration);
                const context = "Generate 10 questions with four options each of medium level difficulty on the topic " + req.body.topics + ". Give the output with answers"
                const completion = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [{
                        role: "user", content: context
                    }]
                });
                const response = completion.data.choices[0].message.content;
                const formattedData = extractQuestionsAndOptions(response);
                details.findOneAndUpdate(
                    { userName: name },
                    { $set: { 'aiquestions': formattedData } },
                    { returnOriginal: false }
                )
                    .then(updatedDocument => {
                        //console.log(updatedDocument);
                        res.status(200).json({ message: "Success", id: updatedDocument.id });
                    })
                    .catch(error => {
                        console.error(error);
                        res.status(500).json({ message: "Internal Server Error" });
                    });
            }
        })
    } else {
        res.status(400).json({ message: "Not Signed In" });
    }
});

function extractQuestionsAndOptions(response) {
    const questionsData = response.split("Answer");
    const questions = [];
    var c = 0;

    for (let i = 0; i < questionsData.length - 1; i++) {
        const lines = questionsData[i].split('\n');
        const options = [];
        var questionText = "";
        var crtAns = "";
        var isCorrect = false;
        if (i === 0) {
            questionText = lines[c];
        } else {
            c = 2;
            questionText = lines[c];
        }
        const l2 = questionsData[i + 1].split('\n');
        crtAns = l2[0].slice(2);
        for (let j = c + 1; j < lines.length - 2; j++) {
            if (crtAns === lines[j]) {
                isCorrect = true;
            }
            else {
                isCorrect = false;
            }
            options.push({ text: lines[j], correct: isCorrect });
        }
        questions.push({ questionText, options });
    }
    return questions;
}

aroute.route('/profile').post((req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, async (err, decoded) => {
            if (err) {
                res.status(400).json({ message: "Not Valid User" });
            } else {
                let name = "";
                name = decoded.u;
                const configuration = new Configuration({
                    organization: "",
                    apiKey: ""
                });
                const openai = new OpenAIApi(configuration);
                const context = "Give Answer in single word: State Gender For Name: " + name + " Or state it as bot";
                const completion = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [{
                        role: "user", content: context
                    }]
                });
                const response = completion.data.choices[0].message.content;
                //console.log(response);
                details.find({ userName: name }).then((data) => {
                    data.forEach((item) => {
                        // console.log(item.userName);
                        // console.log(item.emailID);
                        // console.log(item.createdAt.getMonth()+1);
                        // console.log(item.createdAt.getFullYear());
                        // console.log(item.isSub);
                        // console.log(item.noTurns);
                        const d = {
                            userName: item.userName,
                            email: item.emailID,
                            joinMonth: item.createdAt.getMonth() + 1,
                            joinYear: item.createdAt.getFullYear(),
                            subscribed: item.isSub,
                            turnsLeft: item.noTurns,
                            isq:item.isq,
                            gender: response
                        }
                        res.status(200).json(d);
                    })
                }).catch((error) => {
                    console.log(error);
                    res.status(400).json({ message: error });
                })
            }
        })
    } else {
        res.status(400).json({ message: "Not Signed In" });
    }

});

aroute.route('/board').post((req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, async (err, decoded) => {
            if (err) {
                res.status(400).json({ message: "Not Valid User" });
            } else {
                let name = "";
                name = decoded.u;
                details.find({ userName: name }).then((data) => {
                    data.forEach((item) => {
                        const d = {
                            users: item.sgqusers,
                            attend: item.attend
                        }
                        //console.log("Sent");
                        res.status(200).json(d);
                    })
                }).catch((error) => {
                    console.log(error);
                    res.status(400).json({ message: error });
                })
            }
        })
    } else {
        res.status(400).json({ message: "Not Signed In" });
    }

});

aroute.route('/sub').post((req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, async (err, decoded) => {
            if (err) {
                res.status(400).json({ message: "Not Valid User" });
            } else {
                console.log(req.body);
                let name = "";
                name = decoded.u;
                details.findOneAndUpdate(
                    { userName: name },
                    { $set: { 'noTurns': req.body.t, 'isSub': "true" } },
                    { returnOriginal: false }
                )
                    .then(updatedDocument => {
                        //console.log(updatedDocument);
                        res.status(200).json({ message: "Success" });
                    })
                    .catch(error => {
                        console.error(error);
                        res.status(500).json({ message: "Internal Server Error" });
                    });
            }
        })
    } else {
        res.status(400).json({ message: "Not Signed In" });
    }
});

aroute.route('/fetch').get((req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, async (err, decoded) => {
            if (err) {
                res.status(400).json({ message: "Not Valid User" });
            } else {
                let name = "";
                name = decoded.u;
                //console.log(response);
                details.find({ userName: name }).then((data) => {
                    data.forEach((item) => {
                        const d = {
                            turnsLeft: item.noTurns,
                            name:name
                        }
                        res.status(200).json(d);
                    })
                }).catch((error) => {
                    console.log(error);
                    res.status(400).json({ message: error });
                })
            }
        })
    } else {
        res.status(400).json({ message: "Not Signed In" });
    }

});

export default aroute;
