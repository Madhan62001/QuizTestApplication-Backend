import express from "express";
import path from "path";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
//import serveStatic from "serve-static";
import db from "./database/db.js"
import createError from 'http-errors';

mongoose.Promise=global.Promise;
mongoose.connect(db,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>{
    console.log("Database Connected Successfully!");
},
error=>{
    console.log("Database error: "+error);
})   

import aroute from "./routes/routes.js";
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cors());

//app.use(serveStatic(path.join(__dirname, 'quickTest')));

app.use('/api', aroute);
 
const port = process.env.PORT || 8000;
 
app.listen(port, () => {
  console.log('Listening on port ' + port)
})

app.use((req, res, next) => {
  next(createError(404));
});
 
app.get('/', (req, res) => {
  res.send('invaild endpoint');
});
 
/*app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'quickTest/index.html'));
});*/

app.use(function (err, req, res, next) {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});
