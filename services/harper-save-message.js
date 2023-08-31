
import axios from 'axios';

function harperSaveMessage(message, username, room, message_id) {
  const dbUrl = process.env.HARPERDB_URL;
  const dbPw = process.env.HARPERDB_PW;
  if (!dbUrl || !dbPw) return null;

  var data = JSON.stringify({
    operation: 'insert',
    schema: 'inline_chat_app',
    table: 'messages',
    records: [
      {
        message,
        username,
        room,
        message_id
      },
    ],
  });

  var config = {
    method: 'POST',
    url: dbUrl,
    headers: {
      'Content-Type': 'application/json',
      Authorization: "Basic "+dbPw,
    },
    data: data,
  };

  return new Promise((resolve, reject) => {
    axios(config)
      .then(function (response) {
        resolve(JSON.stringify(response.data));
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

export default harperSaveMessage;