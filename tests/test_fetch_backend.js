const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "fittrack_dev_secret_change_me";

// generate trainer token
const token = jwt.sign({ id: 5, role: 'trainer' }, JWT_SECRET, { expiresIn: "7d" });

async function testFetch() {
  const res = await fetch(`http://localhost:3000/api/progress/client/6/measurements`, {
    headers: {
      "Authorization": "Bearer " + token
    }
  });
  
  if (!res.ok) {
    console.error("HTTP Error:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("Returned Data:", JSON.stringify(data, null, 2));
}

testFetch().catch(console.error);
