$(document).ready(function () {
  /* global io */
  let socket = io();
  socket.on('user count', function(data) {
    $('h2.center').text(data + ' users online');
  });
  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();


    $('#m').val('');
    return false; // prevent form submit from refreshing page
  });

  
});
