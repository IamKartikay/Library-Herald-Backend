const mongoose = require("mongoose");

const { Schema } = mongoose;

const JournalSchema = new Schema({
  year: { type: Number, required: true},
  volume:{ type: Number, required: true},
  issue:{ type: String, required: true}, //issue2&3
  month:{type: String}
});

const Journal = mongoose.model("Journal", JournalSchema);

module.exports = Journal;

