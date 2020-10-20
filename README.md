# whiskerServ
Back end for whisker

Make sure to `npm install`!

# Usage

To start the server:
`sudo pm2 index.js --name whiskerServ`

Status:
`sudo pm2 status whiskerServ`

Logs:
`sudo pm2 logs whiskerServ --lines=X`
Where X = number of lines you want to view (default 15)

Restart:
`sudo pm2 restart whiskerServ`