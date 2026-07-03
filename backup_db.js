const { PrismaClient, Prisma } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backup() {
  console.log("Bắt đầu sao lưu cơ sở dữ liệu...");
  const models = Prisma.dmmf.datamodel.models;
  const backupData = {};
  
  for (const model of models) {
    const modelName = model.name;
    // Tên delegate trong Prisma thường là camelCase của tên model
    const delegate = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    
    if (prisma[delegate]) {
        console.log(`Đang sao lưu bảng: ${modelName}...`);
        backupData[modelName] = await prisma[delegate].findMany();
    }
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `db_backup_${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
  console.log(`Sao lưu thành công vào file: ${filename}`);
}

backup()
  .catch((e) => {
    console.error("Lỗi khi sao lưu:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
