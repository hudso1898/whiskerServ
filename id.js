  idSize = 32; // size of the ids to generate
  chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // characters to use to generate the id

  // single method to generate an ID - 16 characters based on current time and a random number
  function generateSessionID() {
    let id = '';
    // 1/4: seeded on time plus a random number multiplier (0 to 1)
    for (let i = 0; i < idSize / 4; i++) {
      id += chars.charAt((Date.now() * Math.random() % chars.length));
    }
    // 3/4: seeded only on random number
    for(let i = idSize / 4; i < idSize; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  module.exports = {
      generateSessionId: generateSessionID
  }
