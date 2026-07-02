const fs = require('fs');
const file = 'api/routes/manager.ts';
let code = fs.readFileSync(file, 'utf-8');

// The dangling blocks look like this:
//     res.json({ success: true });
//   } catch (error) { res.status(500).json({ error: 'Server error' }); }
// });

const regex1 = /^\s*res\.json\(\{ success: true \}\);\n\s*\} catch \(error\) \{ res\.status\(500\)\.json\(\{ error: 'Server error' \}\); \}\n\}\);/gm;
code = code.replace(regex1, '');

// There might be some for count:
//     res.json({ success: true, count: ids.length });
//   } catch (error) { res.status(500).json({ error: 'Server error' }); }
// });
const regex2 = /^\s*res\.json\(\{ success: true, count: ids\.length \}\);\n\s*\} catch \(error\) \{ res\.status\(500\)\.json\(\{ error: 'Server error' \}\); \}\n\}\);/gm;
code = code.replace(regex2, '');

fs.writeFileSync(file, code);
