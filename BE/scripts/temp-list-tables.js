require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Table = require("../models/table");
  const Restaurant = require("../models/restaurant");

  const brands = { PVH: "Mì cay Seoul 117 Phan Văn Hớn", BĐ: "Seoul Bà Điểm", DTM: "Seoul Dương Thị Mười" };
  for (const [k, name] of Object.entries(brands)) {
    const r = await Restaurant.findOne({ name }).lean();
    console.log(`\n── ${k} → ${name} (${r ? r._id : "KHÔNG CÓ"}) ──`);
    if (!r) continue;
    const tables = await Table.find({ restaurantId: r._id }).select("name type capacity isAvailable status").sort({ name: 1 }).lean();
    console.log(`Bàn (${tables.length}):`);
    tables.forEach((t) => console.log(`  "${t.name}" | type=${t.type} | cap ${t.capacity?.min}-${t.capacity?.max} | avail=${t.isAvailable} | status=${t.status}`));
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});