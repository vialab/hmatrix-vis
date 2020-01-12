# H-Matrix visualization
 H-Matrix visualization for cross-linguistic effects analysis
 More info at: vialab.ca/hmatrix
 
 ## To change the data on the H-Matrix view
 You will ned to add your data on `server/hmatrix-data.js`
 
 
## To setup a MySQL database

Create `server/dbConfig.json` file for authentication
Template:
```
{
  "host"     : "localhost",
  "user"     : "user",
  "port"     : port,
  "password" : "password",
  "database" : "dbname"
}
```

### Notes
- The server-side express functions are located at `server.js`.
- The matrix visualization is at `public/matrix.html`
- Most functionalities are at `public/js/tree.js` > `drawTree()`
- In the `server.js`, the post API point `/loadMatrix` does most of the aggregating and pre-processing of the data for the visualization.
