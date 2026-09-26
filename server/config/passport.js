const GoogleStrategy = require('passport-google-oauth20').Strategy;
const supabase = require('./supabase');

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://intelliconsult-api.onrender.com/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => { 
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;
      
      let user = null;
      let type = 'patient';
      
      let { data: pUser } = await supabase.from('patients').select('*').eq('email', email).maybeSingle();
      if (pUser) {
          user = pUser;
          type = 'patient';
      } else {
          let { data: dUser } = await supabase.from('doctors').select('*').eq('email', email).maybeSingle();
          if (dUser) {
              user = dUser;
              type = 'doctor';
          } else {
              let { data: aUser } = await supabase.from('admins').select('*').eq('email', email).maybeSingle();
              if (aUser) {
                  user = aUser;
                  type = 'admin';
              }
          }
      }

      if (user) {
        if (!user.google_id) {
          await supabase.from(type + 's').update({ google_id: googleId }).eq('id', user.id);
          user.google_id = googleId;
        }
        return done(null, user);
      } else {
        return done(null, false, { message: 'No account is associated with this Google email. Please sign up first.' });
      }
    } catch (err) {
      console.error(err);
      return done(err, false);
    }
  }));
};