'use strict';

module.exports = function(app, client, nconf, isLoggedIn, hasUsername) {
  var user = require('../lib/user');
  var playlist = require('../lib/playlist');
  var mox = require('../lib/mox');

  var BACKGROUND_DEFAULT = '/images/back.png';

  app.get('/', function (req, res) {
    if (req.session.email) {
      console.log('got here')
      if (req.session.username) {
        res.redirect('/dashboard');
      } else {
        res.redirect('/profile');
      }
    } else {
      res.render('index', {
        pageType: 'index',
        background: BACKGROUND_DEFAULT
      });
    }
  });

  app.get('/logout', function (req, res) {
    req.session.reset();

    res.redirect('/');
  });

  app.get('/profile', isLoggedIn, function (req, res) {
    user.loadProfile(req, client, function(err, user) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        req.session.username = user.username;
        req.session.userId = user.id;
        req.session.background = user.background;
      }

      if (req.session.username) {
        res.redirect('/dashboard');
      } else {
        res.render('profile', {
          pageType: 'profile',
          location: user.location || '',
          website: user.website || '',
          background: user.background || BACKGROUND_DEFAULT
        });
      }
    });
  });

  app.post('/profile', isLoggedIn, function(req, res) {
    if (!req.session.username) {
      req.session.firstVisit = true;
    } else {
      req.session.firstVisit = false;
    }
    user.saveProfile(req, client, function(err, user) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        req.session.username = user.username;
        req.session.background = user.background;
        res.json({
          message: 'Profile has been updated!',
          meta: { firstVisit: req.session.firstVisit }
        });
      }
    });
  });

  app.post('/background', isLoggedIn, function(req, res) {
    user.saveBackground(req, client, nconf, function(err, background) {
      if (err) {
        res.redirect('/profile?error=1');
      } else {
        req.session.background = background;
        res.redirect('/profile');
      }
    });
  });

  app.post('/reset/background', isLoggedIn, function(req, res) {
    req.body.background = '';
    user.saveBackground(req, client, nconf, function(err, background) {
      if (err) {
        res.redirect('/profile?error=1');
      } else {
        req.session.background = '';
        res.redirect('/profile');
      }
    });
  });

  app.get('/dashboard', isLoggedIn, hasUsername, function (req, res) {
    playlist.getGlobal(req, client, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        res.render('dashboard', {
          pageType: 'dashboard',
          playlists: playlists,
          background: req.session.background || BACKGROUND_DEFAULT
        });
      }
    });
  });

  app.get('/user/:id', function(req, res) {
    var isOwner = false;
    var id = parseInt(req.params.id);

    playlist.userRecent(req, client, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {

        if (req.session && req.session.email &&
          parseInt(req.session.userId, 10) === parseInt(req.params.id, 10)) {
          isOwner = true;
        }

        res.render('playlists', {
          pageType: 'userProfile',
          playlists: playlists.data,
          owner: playlists.owner,
          isOwner: isOwner,
          background: playlists.owner.background || BACKGROUND_DEFAULT
        });
      }
    });
  });

  app.get('/playlists', isLoggedIn, hasUsername, function(req, res) {
    playlist.yourRecent(req, client, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        res.render('playlists', {
          pageType: 'playlists',
          playlists: playlists,
          isOwner: true,
          background: req.session.background || BACKGROUND_DEFAULT
        });
      }
    });
  });

  app.get('/playlist/new', isLoggedIn, hasUsername, function (req, res) {
    res.render('new', {
      pageType: 'new',
      session: req.session,
      background: req.session.background || BACKGROUND_DEFAULT
    });
  });

  app.get('/playlists/starred', isLoggedIn, hasUsername, function (req, res) {
    playlist.recentStarred(req, client, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        res.render('starred', {
          pageType: 'starred',
          playlists: playlists,
          background: req.session.background || BACKGROUND_DEFAULT
        });
      }
    });
  });

  app.post('/playlist/star/', isLoggedIn, hasUsername, function (req, res) {
    playlist.star(req, client, function(err, resp) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        if (req.body.starred === 'true') {
          res.json({ 'message': 'unstarred' });
        } else {
          res.json({ 'message': 'starred' });
        }
      }
    });
  });

  app.post('/playlist', isLoggedIn, hasUsername, function (req, res) {
    playlist.add(req, client, function(err, playlist) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ url: '/playlist/' + playlist.id });
      }
    });
  });

  app.get('/playlist/:id', function (req, res) {
    playlist.get(req, client, function(err, playlist) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        if (err) {
          res.redirect('/500');
        } else {
          var moxes = [];
          var isOwner = false;

          if (req.session && req.session.email &&
            parseInt(playlist.owner.id, 10) === parseInt(req.session.userId, 10)) {
            isOwner = true;
          }

          mox.allByPlaylistId(req, client, function(err, moxes) {
            if (err) {
              res.status(500);
              res.json({ message: err.toString() });
            } else {
              res.render('playlist', {
                pageType: 'playlist',
                playlist: playlist,
                moxes: moxes,
                isOwner: isOwner,
                background: playlist.owner.background || BACKGROUND_DEFAULT
              });
            }
          });
        }
      }
    });
  });

  app.post('/playlist/:id', isLoggedIn, hasUsername, function(req, res) {
    playlist.update(req, client, function(err, playlist) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ 'message': 'updated' });
      }
    });
  });

  app.post('/mox', isLoggedIn, hasUsername, function (req, res) {
    mox.add(req, client, function(err, mox) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ mox: mox });
      }
    });
  });

  app.get('/bookmarklet', isLoggedIn, hasUsername, function (req, res) {
    playlist.yourRecent(req, client, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        res.render('bookmarklet', {
          pageType: 'bookmarklet',
          playlists: playlists,
          background: req.session.background || BACKGROUND_DEFAULT
        });
      }
    });
  });

  app.post('/mini/mox', isLoggedIn, hasUsername, function (req, res) {
    mox.add(req, client, function(err, mox) {
      if (err) {
        res.redirect('/bookmarklet?error=1');
      } else {
        res.redirect('/bookmarklet?sucess=1');
      }
    });
  });

  app.delete('/mox', isLoggedIn, hasUsername, function (req, res) {
    mox.delete(req, client);
    res.json({ message: 'deleted' });
  });

  app.delete('/playlist', isLoggedIn, hasUsername, function (req, res) {
    playlist.delete(req, client);
    res.json({ message: 'deleted' });
  });
};
