'use strict';

define(['jquery'],
  function($) {

  var flash = $('#flash');

  var displayMessage = function(data, isError) {
    var msg = data.responseText || data;

    if (typeof msg !== 'object') {
      msg = JSON.parse(msg);
    }

    flash.text(msg.message.split(',').join('\n'));
    if (isError) {
      flash.addClass('error');
    } else {
      flash.removeClass('error');
    }
    flash.fadeIn(500, function() {
      flash.fadeOut(4500);
    });
  };

  var self = {
    serverPost: function(self, callback) {
      $.ajax({
        url: self.attr('action'),
        data: self.serialize(),
        type: 'POST',
        dataType: 'json',
        cache: false
      }).done(function(data) {
        if (data.message) {
          displayMessage(data, false);
        } else if (data.url) {
          document.location.href = data.url;
        }

        if (callback) {
          callback(data);
        }
      }).error(function(data) {
        displayMessage(data, true);
      });
    },

    serverDelete: function(self, options, callback) {
      $.ajax({
        url: self.data('action'),
        data: options,
        type: 'DELETE',
        dataType: 'json',
        cache: false
      }).done(function(data) {
        if (callback) {
          callback(data);
        }
      }).error(function(data) {
        displayMessage(data, true);
      });
    },

    serverGet: function(self, callback) {
      $.ajax({
        url: self.attr('action'),
        type: 'GET',
        dataType: 'json'
      }).done(function(data) {
        if (callback) {
          callback(data);
        }
      }).error(function(data) {
        displayMessage(data, true);
      });
    },
  };

  return self;
});