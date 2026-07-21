const fs = require('fs');

// 1. Update TrainingRegistration.tsx
let tr = fs.readFileSync('src/pages/TrainingRegistration.tsx', 'utf8');

// Imports
tr = tr.replace("import { useLocation } from 'react-router-dom';", "import { useLocation } from 'react-router-dom';\nimport { Pagination } from '../components/Pagination';");

// Initial Date
tr = tr.replace("const initialDate = queryParams.get('date') || '';", "const initialDate = queryParams.get('date') !== null ? queryParams.get('date') : new Date().toLocaleDateString('en-CA');");

// State and pagination logic
tr = tr.replace("const [filterGround, setFilterGround] = useState(initialGround);", `const [filterGround, setFilterGround] = useState(initialGround);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate, filterGround, viewMode]);`);

// Update GRID view map
tr = tr.replace("{sessions.map((session: any) => {", `
                {sessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((session: any) => {`);

// Add pagination after GRID view
tr = tr.replace("                })}\n              </div>", `                })}\n              </div>\n              {sessions.length > 0 && (\n                <div className="mt-6 border-t pt-4">\n                  <Pagination \n                    currentPage={currentPage}\n                    totalPages={Math.ceil(sessions.length / itemsPerPage)}\n                    onPageChange={setCurrentPage}\n                    totalItems={sessions.length}\n                    itemsPerPage={itemsPerPage}\n                  />\n                </div>\n              )}`);

// Update LIST view map
tr = tr.replace("filteredRegistrations.map((reg: any) => (", "filteredRegistrations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((reg: any) => (");

// Add pagination after LIST view
tr = tr.replace("              </tbody>\n            </table>\n          </div>\n        </div>", `              </tbody>\n            </table>\n          </div>\n          {filteredRegistrations.length > 0 && (\n            <div className="p-4 border-t">\n              <Pagination \n                currentPage={currentPage}\n                totalPages={Math.ceil(filteredRegistrations.length / itemsPerPage)}\n                onPageChange={setCurrentPage}\n                totalItems={filteredRegistrations.length}\n                itemsPerPage={itemsPerPage}\n              />\n            </div>\n          )}\n        </div>`);

fs.writeFileSync('src/pages/TrainingRegistration.tsx', tr);

// 2. Update TrainingSessionManager.tsx
let ts = fs.readFileSync('src/pages/TrainingSessionManager.tsx', 'utf8');

// Imports
ts = ts.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate } from 'react-router-dom';\nimport { Pagination } from '../components/Pagination';");

// State and logic
ts = ts.replace("const [filterGroundId, setFilterGroundId] = useState('');", `const [filterGroundId, setFilterGroundId] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, filterGroundId, activeTab]);`);

// Update Table Map
ts = ts.replace("filteredSessions.length > 0 ? filteredSessions.map((s: any, idx: number) => (", "filteredSessions.length > 0 ? filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((s: any, idx: number) => (");

// STT in map
ts = ts.replace("<td>{idx + 1}</td>", "<td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>");

// Add Pagination
ts = ts.replace("              </tbody>\n            </table>\n          </div>\n        </div>", `              </tbody>\n            </table>\n          </div>\n          {filteredSessions.length > 0 && (\n            <div className="p-4 border-t">\n              <Pagination \n                currentPage={currentPage}\n                totalPages={Math.ceil(filteredSessions.length / itemsPerPage)}\n                onPageChange={setCurrentPage}\n                totalItems={filteredSessions.length}\n                itemsPerPage={itemsPerPage}\n              />\n            </div>\n          )}\n        </div>`);

fs.writeFileSync('src/pages/TrainingSessionManager.tsx', ts);

console.log("Updated both files successfully.");
