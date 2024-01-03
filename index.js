require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// Basic Configuration
const port = process.env.PORT || 3000;
const mySecret = process.env["MONGO_URI"];
app.use(cors());

app.use(express.static(`public`));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});
//db
mongoose
  .connect(mySecret, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

//starter

const userSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: Date },
    },
  ],
});

const User = mongoose.model("User", userSchema);
// post api/users new user
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const newUser = new User({ username, count: 0 });

    await newUser.save();

    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// get all the users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("username _id");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// post exercises
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    // Validate exercise data
    if (!description || !duration) {
      return res
        .status(400)
        .json({ error: "Description and duration are required" });
    }
    console.log(date);
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          log: {
            description,
            duration,
            date: date ? new Date(date) : new Date(),
          },
        },
        $inc: { count: 1 }, // Increment count within the $push operation
      },
      { new: true },
    ); // Return updated user document

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let i = user.log[user.log.length - 1];
    const exercise = {
      description: i.description,
      duration: i.duration,
      date: new Date(i.date).toDateString(),
    };
    // Access the newly added exercise
    res.json({
      username: user.username,
      _id: user._id,
      ...exercise, // Include exercise details directly
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: "User not found" });
    } else {
      let log = user.log;
      if (from) {
        log = log.filter(
          (exercise) => new Date(exercise.date) >= new Date(from),
        );
      }
      if (to) {
        log = log.filter((exercise) => new Date(exercise.date) <= new Date(to));
      }
      if (limit) {
        log = log.slice(0, limit);
      }
      res.json({
        username: user.username,
        count: user.count,
        _id: user._id,
        log: log.map((exercise) => ({
          description: exercise.description,
          duration: exercise.duration,
          date: new Date(exercise.date).toDateString(),
        })),
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
