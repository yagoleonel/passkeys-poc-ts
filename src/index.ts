import express from 'express';
import { backendRoutes, frontendRoutes } from './routes';
import { database } from './database';

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', frontendRoutes)
app.use('/api', backendRoutes)

database.initialize().then(() => {
  console.log("Database is ready");
}).catch((err) => {
  console.log("Database error", err);
  process.exit(1);
})

app
  .listen(port, function () {
    console.log(`Server is running on port ${port}.`);
  })
  .on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.log("Error: address already in use");
    } else {
      console.log(err);
    }
  });