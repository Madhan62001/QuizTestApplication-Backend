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
//const client = new OAuth2Client('569465991930-ste1q4vbvonur3ph82tjrubhpcdqaqi2.apps.googleusercontent.com');

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

// aroute.route('/gverify',async (req,res)=>{
//     const token=req.body.id;
//     try {
//         const ticket = await client.verifyIdToken({
//           idToken: token,
//           audience: '569465991930-ste1q4vbvonur3ph82tjrubhpcdqaqi2.apps.googleusercontent.com'
//         });
    
//         const payload = ticket.getPayload();
//         const userId = payload['sub'];
//         const name= payload['name'];
//         const email = payload['email'];
//         console.log(payload);
//         let existingUser=await details.findOne({emailID: email});
//         if(existingUser){
//             const token = jwt.sign({u,p}, myJWTSecretKey);
//             res.cookie('token', token, { httpOnly: true });
//             res.status(200).json({message: "Successful",token});
//         }
//         else{
//             let data={
//                 userName: name,
//                 emailID: email,
//                 password: ""
//             }
//             details.create(data).then(()=>{
//             console.log("Data Created");
//             const token = jwt.sign({u,p}, myJWTSecretKey);
//             res.cookie('token', token, { httpOnly: true });
//             res.status(200).json({message:"Successful",token});
//             })
//         }
//         //res.sendStatus(200).json({message:"Successful"},token);
//       } catch (error) {
//         console.error('Error verifying token:', error);
//         res.sendStatus(401).json({message:error});
//       }            
// });


aroute.get('/profile', (req, res) => {
    const token = req.cookies.token;
    if (token) {
      jwt.verify(token, myJWTSecretKey, (err, decoded) => {
        if (err) {
          res.status(401).json({ message: 'Invalid token' });
        } else {
          res.json({message:"LoggedIn", username: decoded.username });
        }
      });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
});
export default aroute;
