const fs = require('fs');

const files = [
  'src/pages/CourseManager.tsx',
  'src/pages/CriterionManager.tsx',
  'src/pages/ExamManager.tsx',
  'src/pages/SystemLogs.tsx',
  'src/pages/TestTypeManager.tsx',
  'src/pages/VehicleTypeManager.tsx'
];

files.forEach(f => {
  try {
    let content = fs.readFileSync(f, 'utf8');
    
    // We want to replace the pagination wrapper block
    // Looking for something like:
    // <div className="pagination-wrapper mt-4">
    //   <span className="text-muted">...</span>
    //   <div className="pagination flex" ...>
    //     ...
    //   </div>
    // </div>
    // The regex matches <div className="pagination-wrapper... up to the first </div>\s*</div> that comes after <div className="pagination flex"
    
    const regex = /<div className="pagination-wrapper[^>]*>[\s\S]*?<div className="pagination flex"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
    
    if (regex.test(content)) {
      content = content.replace(regex, `<div className="pagination-wrapper mt-4">\n              <Pagination \n                currentPage={currentPage}\n                totalPages={totalPages}\n                onPageChange={setCurrentPage}\n              />\n            </div>`);
      fs.writeFileSync(f, content, 'utf8');
      console.log('Fixed ' + f);
    } else {
      console.log('Regex did not match for ' + f);
    }
  } catch(e) {
    console.error('Error processing ' + f, e);
  }
});
