require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/db');

if (process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_CONFIG) {
  const { onRequest } = require('firebase-functions/v2/https');
  exports.api = onRequest({ cors: true, maxInstances: 10 }, app);
} else {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}
