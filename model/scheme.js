import mongoose from "mongoose";
const Schema=mongoose.Schema;
let detail= new Schema({
    userName: String,
    emailID: String,
    password: String
},{
    timestamps:true,
    strict: false
})
let details = mongoose.model('detail',detail);
export default details;