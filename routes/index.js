const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const supabase = require("../models/supabase");
const passport = require("../config/passport");

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

router.get("/", async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from("texts")
      .select("id, title, content, timestamp, author_id");

    if (error) throw error;

    let enrichedMessages = [];

    // If user is authenticated and a member
    if (req.isAuthenticated() && req.user.membership_status) {
      for (const message of messages) {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", message.author_id)
          .single();

        if (!userError) {
          enrichedMessages.push({
            ...message,
            author: `${user.first_name} ${user.last_name}`,
          });
        }
      }
    } else {
      // If not a member, anonymize authors and hide timestamps
      enrichedMessages = messages.map((message) => ({
        ...message,
        author: "Anonymous",
        timestamp: null,
      }));
    }

    // Pass user object to the template
    res.render("index", { 
      title: "Members Only", 
      messages: enrichedMessages, 
      user: req.user || null // Add user here
    });
  } catch (err) {
    res.render("index", { 
      title: "Members Only", 
      error: "Error loading messages.", 
      user: req.user || null // Ensure user is passed even on error
    });
  }
});




// Sign-Up Form (GET)
router.get("/sign-up", (req, res) => {
  res.render("sign-up", { title: "Sign Up", error: null });
});

// Sign-Up Submission (POST)
router.post("/sign-up", async (req, res) => {
  const { first_name, last_name, username, password, confirmPassword } =
    req.body;

  // Validate form fields
  if (!first_name || !last_name || !username || !password || !confirmPassword) {
    return res.render("sign-up", {
      title: "Sign Up",
      error: "All fields are required.",
    });
  }
  if (password !== confirmPassword) {
    return res.render("sign-up", {
      title: "Sign Up",
      error: "Passwords do not match.",
    });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into the database
    const { data, error } = await supabase
      .from("users")
      .insert([{ first_name, last_name, username, password: hashedPassword }]);

    if (error) throw error;

    res.redirect("/login"); // Redirect to the homepage after successful sign-up
  } catch (err) {
    res.render("sign-up", {
      title: "Sign Up",
      error: "Error creating user. Try again.",
    });
  }
});

// Membership Form (GET)
router.get("/join-club", ensureAuthenticated, (req, res) => {
  res.render("join-club", { title: "Join the Club", error: null });
});

// Membership Submission (POST)
router.post("/join-club", ensureAuthenticated, async (req, res) => {
  const { passcode } = req.body;
  const secretPasscode = "SECRET123"; // Replace with your actual secret passcode
  const userId = req.user.id; // Access user ID from req.user, not from session

  if (!userId) {
    return res.redirect("/login"); // Redirect to login if not logged in
  }

  if (passcode !== secretPasscode) {
    return res.render("join-club", {
      title: "Join the Club",
      error: "Incorrect passcode. Try again!",
    });
  }

  try {
    // Update membership status in the database
    const { error } = await supabase
      .from("users")
      .update({ membership_status: true }) // Mark the user as a member
      .eq("id", userId);

    if (error) throw error;

    res.redirect("/dashboard"); // Redirect to the homepage after successful membership
  } catch (err) {
    res.render("join-club", {
      title: "Join the Club",
      error: "An error occurred. Please try again.",
    });
  }
});

// Login Form (GET)
router.get("/login", (req, res) => {
  res.render("login", { title: "Login", error: null });
});

// Login Submission (POST)
router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true, // If using flash messages
  }),
  (req, res) => {
    res.redirect("/"); // Redirect to homepage after login
  }
);

// Logout Route
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

// Member Dashboard (GET)
router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    // Fetch user details from session
    const user = req.user;

    // Check if the user is a member
    if (user.membership_status) {
      res.render("dashboard", {
        title: "Dashboard",
        user,
        membershipStatus: "You are a member of the club!",
      });
    } else {
      res.render("dashboard", {
        title: "Dashboard",
        user,
        membershipStatus: "You are not a member yet.",
      });
    }
  } catch (err) {
    res.render("dashboard", {
      title: "Dashboard",
      error:
        "An error occurred while fetching your information. Please try again later.",
    });
  }
});

router.get("/new-message", ensureAuthenticated, (req, res) => {
  res.render("new-message", { title: "Create New Message", error: null });
});

router.post("/new-message", ensureAuthenticated, async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    req.flash("error", "All fields are required.");
    return res.redirect("/new-message");
  }

  try {
    const { error } = await supabase.from("texts").insert([
      { 
        title, 
        content, 
        author_id: req.user.id, 
      },
    ]);

    if (error) throw error;

    req.flash("success", "Message created successfully!");
    res.redirect("/");
  } catch (err) {
    req.flash("error", "Error creating the message. Try again.");
    res.redirect("/new-message");
  }
});


module.exports = router;
