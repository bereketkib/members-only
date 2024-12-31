require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("./config/passport");
const path = require("path");
const flash = require("connect-flash");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(flash());

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session Setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes Placeholder
app.use("/", require("./routes/index"));

// Start Server
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
