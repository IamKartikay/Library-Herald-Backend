const mongoose = require('mongoose');

const {Schema} = mongoose;


const ArticleSchema = new Schema({
    firstPage: { type: Number},
    lastPage: { type: Number},
    printISSN: {type: String},
    onlineISSN:{type: String},
    doi: {type: String},
    title: {type: String},
    authors: {type: String},
    authorDetails: {type: String},
    abstract: {type: String},
    keywords: {type: String},
    journal: {type: mongoose.Schema.Types.ObjectId, ref: 'Journal'},
    likes: {type: Number},
    views: {type: Number}
  });
  
  const Article = mongoose.model("Article", ArticleSchema);
  
  module.exports = Article;
  
  