const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Journal = require("./models/Journal");
const Article = require("./models/Article");
const { ObjectId } = require("mongodb");
const { Resend } = require("resend");
require('dotenv').config();
const fs = require("fs");
const path = require("path");
const { log } = require("console");

const resend = new Resend(process.env.RESEND_KEY);
const app = express();
const port = 5000;
app.use(cors());
app.use(express.json());

const volumeRegex = /Volume-(\d+)/;
const issueRegex = /Issue-([^ (\n]+)/;
const monthRegex = /\(([^)]+)\)/;

const extractInfo = (input, regex) => {
  const match = input.match(regex);
  return match ? match[1] : null;
};

async function main() {
  const con = await mongoose.connect(process.env.MONDOGB_KEY);
  console.log("connected");
} 
main();

//const fs = require("fs").promises;
// async function readJsonFile() {
//   try {
//     // Read the JSON file asynchronously
//     const allData = await fs.readFile("data.json", "utf-8");

//     // Parse the JSON data
//     const data = JSON.parse(allData);

//     return data;
//   } catch (error) {
//     throw new Error(`Error reading or parsing JSON file: ${error.message}`);
//   }
// }

// readJsonFile().then((data) => makeEntry(data));

// async function makeEntry(data) {
//   try {
//     //console.log(data);
//     for (var y = 0; y < data.length; y++) {
//       const year = data[y].year;
//       for (var i = 0; i < data[y].sub.length; i++) {
//         const volume = extractInfo(data[y].sub[i].VI, volumeRegex);
//         const issue = extractInfo(data[y].sub[i].VI, issueRegex);
//         const month = extractInfo(data[y].sub[i].VI, monthRegex);

//         //we have all the details for an journal
//         console.log(year, volume, issue, month);

//         const journal = await Journal.create({
//           year,
//           volume,
//           issue,
//           month
//         })

//         const createArticlePromises = data[y].sub[i].link.map(async (art) => {
//           try {
//             const d = await Article.create({
//               firstPage: art.firstPage,
//               lastPage: art.lastPage,
//               printISSN: art.printISSN,
//               onlineISSN: art.onlineISSN,
//               doi: art.doi,
//               title: art.heading,
//               authors: art.authors,
//               authorDetails: art.authorDes,
//               abstract: art.abstract,
//               keywords: art.keywords,
//               journal: journal._id,
//             });

//             return d; // Return the created article
//           } catch (error) {
//             console.error("Error creating Article:", error);
//             throw error; // Propagate the error up
//           }
//         });

//         try {
//           const createdArticles = await Promise.all(createArticlePromises);
//           console.log("All articles created:", createdArticles);
//         } catch (error) {
//           console.error("Error creating articles:", error);
//         }

//         //a issue is complete
//       }

//       //a year is complete
//     }
//   } catch (error) {
//     console.log("error in ", y, i, error);
//   }
// }

app.get("/", async (req, res) => {

  const currentJournal = await Journal.aggregate([
    {
      $group: {
        _id: "$year", // Group by year
        issue: { $max: "$issue" }, // Find the maximum issue for each year
        volume: { $max: "$volume" }, // Find the maximum issue for each year
        id:{$first: "$_id" },
      }
    },
    {
      $sort: { _id: -1 } // Sort by year in descending order
    },
    {
      $limit: 1 // Limit to the first result which will be the maximum year
    },
  ]);
  console.log(currentJournal[0]);
  res.send(currentJournal[0]);
});

app.get("/allJournals", async (req, res) => {
  try {
    const allJournals = await Journal.find({})
    .sort({ year: -1, issue: -1 })
    .exec();
    const currentJournal = await Journal.aggregate([
      {
        $group: {
          _id: null,
          maxYear: { $max: "$year" }, // Assuming "year" is the field you want to find the maximum for
        },
      },
      {
        $lookup: {
          from: "journals",
          localField: "maxYear",
          foreignField: "year",
          as: "documentsWithMaxYear",
        },
      },
      {
        $unwind: "$documentsWithMaxYear",
      },
      {
        $replaceRoot: { newRoot: "$documentsWithMaxYear" },
      },
    ])
    .sort({ year: -1, issue: -1 })
    .exec();
    const allYears = await Journal.distinct("year");
    const finalData = {
      allJournals: allJournals,
      currentJournal: currentJournal,
      years: allYears,
    };
    //console.log(finalData);
    res.json(finalData);
  } catch (error) {
    console.log(error);
  }
});

app.get("/searhByYear", async (req, res) => {
  try {
    const { year } = req.query;
    const yearJournals = await Journal.find({ year });
    res.json(yearJournals);
  } catch (error) {
    console.log(error);
  }
});

app.get("/categories", async (req, res) => {
  try {
    const { year, issue } = req.query;
    //console.log(year, issue);
    const journal = await Journal.findOne({ year, issue });
    const articles = await Article.find({ journal: new ObjectId(journal._id) });
    res.json(articles);
  } catch (error) {
    console.log(error);
  }
});

app.get("/article", async (req, res) => {
  try {
    const { _id } = req.query;
    const article = await Article.findOne({ _id });
    res.json(article);
  } catch (error) {
    console.log(error);
  }
});

app.post("/contact-us", (req, res) => {
  const { firstName, lastName, email, phone, message } = req.body;
  try {
    resend.emails.send({
      from: "onboarding@resend.dev",
      to: "kartikaysingh.business@gmail.com",
      subject: "Library Herald Query",
      html: `<p> ${message}<br/><br/><strong>Sender Information<br/></strong><strong>Name:</strong> ${firstName} ${lastName}<br/><strong>Email:</strong> Email: ${email}<br/><strong>Phone No:</strong> ${phone}<br/><br/></p>`,
    });
    res.send("Email sent successfully!");
  } catch (error) {
    console.log(error);
    res.end();
  }
});

app.put("/incrementLikes", async (req, res) => {
  const { id } = req.body;
  console.log(id);
  try {
    const result = await Article.updateOne({ _id: id }, { $inc: { likes: 1 } });
    console.log(result);
    const newLikes = await Article.findOne(
      { _id: new ObjectId(id) },
      { likes: 1, _id: 0 }
    );
    res.status(200).end();
  } catch (error) {
    console.log("in liking", error);
  }
});

app.put("/decrementLikes", async (req, res) => {
  const { id } = req.body;
  try {
    const result = await Article.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { likes: -1 } }
    );
    res.status(200).end();
  } catch (error) {
    console.log("in disliking", error);
  }
});

app.put("/incrementViews", async (req, res) => {
  const { id } = req.body;
  try {
    const result = await Article.updateOne({ _id: id }, { $inc: { views: 1 } });
    res.status(200).end();
  } catch (error) {
    console.log("in viewinc", error);
  }
});

app.get("/download_copyright_form", async (req, res) => {
  var filePath = path.join(__dirname, "/Copyright_Assignment_Form.pdf");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    res.contentType("application/pdf");
    res.send(data);
  });
});

app.listen( process.env.PORT, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
});
