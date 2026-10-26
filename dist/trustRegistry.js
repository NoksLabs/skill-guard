import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

                                              

                               
                        
                        
                              
                        
                              
  

                          
                                                         
                        
                                                                             
                          
                                                      
                             
                                     
                                                            
  

                             
                      
                                                         
  

const EMPTY_REGISTRY                = { version: 1, entries: {} };

export const projectRegistryPath = (projectDir        )         =>
  join(projectDir, '.agents', 'skills-trust.json');

export const userRegistryPath = ()         => join(homedir(), '.agents', 'skills-trust.json');

export const loadRegistry = (path        )                => {
  const parsed                                = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : EMPTY_REGISTRY;
  return parsed?.entries === undefined ? EMPTY_REGISTRY : { version: 1, entries: parsed.entries };
};

export const saveRegistry = (path        , registry               )       =>
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        version: 1,
        entries: Object.fromEntries(
          Object.entries(registry.entries).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        ),
      },
      null,
      2,
    )}\n`,
  );

export const isAccepted = (finding         , accepted                                )          =>
  accepted.some(
    (entry) =>
      entry.rule === finding.rule &&
      entry.file === finding.file &&
      entry.fileSha256 === finding.fileSha256,
  );

                           
                              
                                                         

export const decideTrust = (p   
                      
                                 
                                                          
                               
 )                => {
  const known = p.entries.filter((entry) => entry !== undefined);
  if (known.some((entry) => entry.status === 'blocked')) {
    return { allowed: false, reason: `Skill "${p.id}" is blocked in the skills trust registry.` };
  }
  if (known.some((entry) => entry.status === 'approved' && entry.sha256 === p.currentSha256)) {
    return { allowed: true };
  }
  return !known.some((entry) => entry.status === 'approved')
    ? {
        allowed: false,
        reason: `Skill "${p.id}" is not approved. Scan and review it, then run \`${p.approveHint}\`.`,
      }
    : {
        allowed: false,
        reason: `Skill "${p.id}" changed since it was approved (content hash differs). Re-scan, review the diff, then run \`${p.approveHint}\` again.`,
      };
};
