import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser";
const aroute=express.Router();
import {OAuth2Client} from 'google-auth-library';
import details from "../model/scheme.js"
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
                res.send(status);
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
            console.log(req.body.qarr);
            details.findOneAndUpdate(
                { userName: name },
                { $set: { 'questions': req.body.qarr,
                          'option1': req.body.o1,
                          'option2': req.body.o2,
                          'option3': req.body.o3,
                          'option4': req.body.o4,
                          'answers': req.body.ca } },
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

export default aroute;
