const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const supabase = require("../models/supabase");

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Fetch user from Supabase
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !user) {
        return done(null, false, {
          message: "Incorrect username or password.",
        });
      }

      // Compare passwords
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, {
          message: "Incorrect username or password.",
        });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id); // Save user ID in the session
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
