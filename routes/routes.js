import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser";
const aroute=express.Router();
import {OAuth2Client} from 'google-auth-library';
import details from "../model/scheme.js";
import {Configuration, OpenAIApi} from "openai";

const app=express();
app.use(cookieParser());
app.use(express.json());


const saltRounds=10;
const myJWTSecretKey="Madhan";
aroute.route('/register').post((req,res,next)=>{

    bcrypt.genSalt(saltRounds,function(err,salt){
        bcrypt.hash(req.body.password,salt,function(err,hash){
            let data={
                userName: req.body.userName,
                emailID: req.body.emailID,
                password: hash
            }
            details.create(data).then(()=>{
                let status={
                    "statusCode":"200",
                    "statusMessage":"Success!"
                }
                console.log("Data Received");
                //console.log(req.body);
                res.send(status).json({message:"Registered!"});
            }).catch((error)=>{
                console.log(error);
            });
        });
    });
});

aroute.route('/login').post((req,res,next)=>{
    details.find({userName: req.body.userName}).then((data)=>{
        console.log("Came Here")
        let status={
            "statusCode":"",
            "statusMessage":"",
            "errorMessage":""
        }
        //console.log(data);
        let u="",p="";
        data.forEach((item)=>{
            u=item.userName,
            p=item.password
        });
        //console.log(p);
        bcrypt.compare(req.body.password,p,function(err,result){
            console.log("Result: ",result);
            if(result){
                const token = jwt.sign({u,p}, myJWTSecretKey);
                res.cookie('token', token, { httpOnly: true }); 
                res.status(200).json({message: "LoggedIn",token});
                //res.send(status);
            }else{
                res.status(400).json({message: err});
            }
        });
    }).catch((error)=>{
        console.log(error);
    })
});

aroute.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
});

aroute.route('/uquiz').post((req,res,next)=>{
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, (err, decoded) => {
        if (err) {
            res.status(401).json({message: "Not Valid User"});
        } else {
            let name="";
            name=decoded.u;
            //console.log(req.body);
            details.findOneAndUpdate(
                { userName: name },
                { $set: { 'questions': req.body.questions} },
                { returnOriginal: false } 
              )
              .then(updatedDocument => {
                console.log(updatedDocument);
                res.status(200).json({ message: "Data Received And Stored" });
              })
              .catch(error => {
                console.error(error);
                res.status(500).json({ message: "Internal Server Error" });
              });
            }
          });
    } else {
        res.status(401).json({message: "Not Signed In"});
    }
});

aroute.route('/ques').post((req,res,next)=>{
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, (err, decoded) => {
        if (err) {
            res.status(401).json({message: "Not Valid User"});
        } else {
            let name="";
            name=decoded.u;
            //console.log(req.body);
            details.find({userName:name}).then((data)=>{
                // console.log("Here!")
                // console.log(data);
                data.forEach((item)=>{
                    //console.log(item.questions);
                    res.status(200).json({message: item.questions});
                })
            }).catch((error)=>{
                console.log(error);
            })
            }
        });
    } else {
        res.status(401).json({message: "Not Signed In"});
    }    
});

aroute.route('/save').post((req,res,next)=>{
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
        jwt.verify(token, myJWTSecretKey, (err, decoded) => {
        if (err) {
            res.status(401).json({message: "Not Valid User"});
        } else {
            let name="";
            name=decoded.u;

            details.findOneAndUpdate({userName:name},
                { $set: { 'sgqusers': req.body.d} },
                { returnOriginal: false } ).then((data)=>{
                // console.log("Here!")
                console.log(data);
                res.status(200).json({message:" Points Updated!"});
            }).catch((error)=>{
                console.log(error);
            })
            }
        });
    } else {
        res.status(401).json({message: "Not Signed In"});
    }    
});

aroute.route('/ai').post((req,res,next)=>{
    const token = req.headers.authorization.split(' ')[1];
    if(token){
        jwt.verify(token,myJWTSecretKey,async (err,decoded)=>{
            if(err){
                res.status(400).json({message:"Not Valid User"});
            } else{
                let name="";
                name=decoded.u;
                console.log(name);
                const configuration=new Configuration({
                    organization:"org-0AsbxvxEniuvz70VsbWNG50t",
                    apiKey:"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",
                });
                const openai=new OpenAIApi(configuration);
                const context="Generate 10 mcqs with four options each of medium level difficulty on the topic "+req.body.topics+". Give the output with answers"
                const completion=await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages:[{
                        role:"user", content:context
                    }]
                });
                //console.log(completion.data.choices[0].message.content);
                const response = completion.data.choices[0].message.content;
                const formattedData = extractQuestionsAndOptions(response);
                // console.log("///////////////////////////////");
                //console.log(formattedData);
                details.findOneAndUpdate(
                    { userName: name },
                    { $set: { 'questions': formattedData} },
                    { returnOriginal: false } 
                  )
                  .then(updatedDocument => {
                    console.log(updatedDocument);
                    res.status(200).json({ message: "Success" });
                  })
                  .catch(error => {
                    console.error(error);
                    res.status(500).json({ message: "Internal Server Error" });
                  });
                // console.log(completion.data.choices[0].message.content);
                //res.status(200).json({message:"Success!"});
            }
        })
    }else{
        res.status(400).json({message:"Not Signed In"});
    }
});

function extractQuestionsAndOptions(response){
    const questionsData = response.split("Answer");
  //console.log(questionsData);
  const questions = [];
  var c=0;
  
  for(let i=0;i<questionsData.length-1;i++){
      const lines=questionsData[i].split('\n');
      const options = [];
      var questionText = "";
      var crtAns="";
      var isCorrect=false;
      //console.log(lines);
      if(i===0){
          questionText=lines[c];
      }else{
          c=2;
          questionText=lines[c];
      }
      const l2=questionsData[i+1].split('\n');
      crtAns=l2[0].slice(2);
      //console.log("Correct Answer: ",crtAns);
      for(let j=c+1;j<lines.length-2;j++){
          if(crtAns===lines[j]){
              isCorrect=true;
          }
          else{
              isCorrect=false;
          }
          //console.log(lines[j]);
          options.push({text:lines[j], correct: isCorrect});
      }
       //console.log("QuestionText: ",questionText);
       //console.log("Options: ",options);
       questions.push({questionText, options});
  }
  return questions;
}

export default aroute;
