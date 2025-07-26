// Law mappings between old and new Indian legal codes
const lawMappings = {
  // IPC to BNS mappings (key examples)
  ipcToBns: {
    '375': '63', // Rape
    '376': '64', // Punishment for rape
    '302': '103', // Murder
    '300': '101', // Murder definition
    '299': '100', // Culpable homicide
    '304': '105', // Culpable homicide not amounting to murder
    '307': '109', // Attempt to murder
    '320': '114', // Grievous hurt
    '322': '115', // Voluntarily causing grievous hurt
    '379': '303', // Theft
    '380': '305', // Theft in dwelling house
    '392': '309', // Robbery
    '395': '310', // Dacoity
    '420': '318', // Cheating
    '463': '336', // Forgery
    '468': '340', // Forgery for purpose of cheating
    '471': '342', // Using forged document
    '354': '74', // Assault or criminal force to woman with intent to outrage her modesty
    '354A': '75', // Sexual harassment
    '354B': '76', // Assault or use of criminal force to woman with intent to disrobe
    '354C': '77', // Voyeurism
    '354D': '78', // Stalking
    '509': '79', // Word, gesture or act intended to insult the modesty of a woman
    '269': '271', // Negligent act likely to spread infection of disease
    '270': '272', // Malignant act likely to spread infection of disease
    '294': '294', // Obscene acts and songs
    '498A': '85', // Husband or relative of husband of a woman subjecting her to cruelty
  },

  // CrPC to BNSS mappings (key examples)
  crpcToBnss: {
    '154': '173', // Information in cognizable cases
    '156': '175', // Police officer's power to investigate cognizable cases
    '157': '176', // Procedure for investigation
    '161': '180', // Examination of witnesses by police
    '162': '181', // Statements to police not to be signed
    '164': '183', // Recording of confessions and statements
    '167': '187', // Procedure when investigation cannot be completed in 24 hours
    '170': '190', // Release of accused when evidence deficient
    '173': '193', // Report of police officer on completion of investigation
    '190': '210', // Cognizance of offences by Magistrates
    '200': '220', // Examination of complainant
    '202': '222', // Postponement of issue of process
    '204': '224', // Issue of process
    '207': '227', // Supply of copies
    '227': '247', // Discharge
    '228': '248', // Framing of charge
    '243': '263', // Evidence for prosecution
    '244': '264', // Evidence for defence
    '248': '268', // Acquittal
    '309': '329', // Power to postpone or adjourn proceedings
    '311': '331', // Power to summon material witness or examine person present
    '313': '333', // Power to examine the accused
    '354': '374', // Language of record of evidence
    '357': '377', // Order to pay compensation
    '358': '378', // Compensation to persons groundlessly arrested
    '362': '382', // Bar to fresh trial for same offence
    '365': '385', // Appeal from orders of acquittal
    '374': '394', // Appeal to High Court
    '378': '398', // Appeal to Supreme Court
    '389': '409', // Suspension of sentence pending appeal
    '397': '417', // Calling for records to exercise powers of revision
    '401': '421', // High Court's powers of revision
    '432': '452', // Power to suspend or remit sentences
    '433': '453', // Power to commute sentence
    '436': '456', // In what cases bail to be taken
    '437': '457', // When bail may be taken in case of non-bailable offence
    '438': '458', // Direction for grant of bail to person apprehending arrest
    '439': '459', // Special powers of High Court or Court of Session regarding bail
  },

  // Indian Evidence Act to BSA mappings (key examples)
  evidenceToBsa: {
    '3': '3', // Evidence
    '5': '5', // Evidence may be given of facts in issue and relevant facts
    '6': '6', // Relevancy of facts forming part of same transaction
    '7': '7', // Facts which are the occasion, cause or effect of facts in issue
    '8': '8', // Motive, preparation and previous or subsequent conduct
    '9': '9', // Facts necessary to explain or introduce relevant facts
    '10': '10', // Things said or done by conspirator in reference to common design
    '11': '11', // When facts not otherwise relevant become relevant
    '12': '12', // In suits for damages, facts tending to enable Court to determine amount are relevant
    '13': '13', // Facts relevant when right or custom is in question
    '14': '14', // Facts showing existence of state of mind, body or bodily feeling
    '15': '15', // Facts bearing on question whether act was accidental or intentional
    '17': '17', // Admission defined
    '18': '18', // Admission by party to proceeding or his agent
    '19': '19', // Admissions by persons whose position must be proved as against party making admission
    '20': '20', // Admissions by persons expressly referred to by party to suit for information
    '21': '21', // Proof of admissions against persons making them and by or on their behalf
    '22': '22', // When oral admissions as to contents of documents are relevant
    '23': '23', // What admissions are relevant
    '24': '24', // Confession caused by inducement, threat or promise when irrelevant in criminal proceeding
    '25': '25', // Confession to police officer not to be proved
    '26': '26', // Confession by accused while in custody of police not to be proved against him
    '27': '27', // How much of information received from accused may be proved
    '28': '28', // Confession made after removal of impression caused by inducement, threat or promise, relevant
    '29': '29', // Confession otherwise relevant not to become irrelevant because accused was drunk
    '30': '30', // Consideration of proved confession affecting person making it and others jointly under trial for same offence
    '32': '32', // Cases in which statement of relevant fact by person who is dead or cannot be found is relevant
    '33': '33', // Relevancy of certain evidence for proving in subsequent proceeding the truth of facts therein stated
    '34': '34', // Entries in books of account when relevant
  }
};

// Reverse mappings for quick lookup
const bnsToIpc = {};
Object.keys(lawMappings.ipcToBns).forEach(ipcSection => {
  const bnsSection = lawMappings.ipcToBns[ipcSection];
  bnsToIpc[bnsSection] = ipcSection;
});

const bnssToCrpc = {};
Object.keys(lawMappings.crpcToBnss).forEach(crpcSection => {
  const bnssSection = lawMappings.crpcToBnss[crpcSection];
  bnssToCrpc[bnssSection] = crpcSection;
});

const bsaToEvidence = {};
Object.keys(lawMappings.evidenceToBsa).forEach(evidenceSection => {
  const bsaSection = lawMappings.evidenceToBsa[evidenceSection];
  bsaToEvidence[bsaSection] = evidenceSection;
});

// Law preference order (newer laws first)
const lawPreferences = {
  criminal_code: ['BNS', 'IPC'],
  criminal_procedure: ['BNSS', 'CRPC'],
  evidence: ['BSA', 'INDIAN_EVIDENCE_ACT']
};

// Document type to law category mapping
const documentTypeToCategory = {
  'bns': 'criminal_code',
  'ipc': 'criminal_code',
  'bnss': 'criminal_procedure',
  'crpc': 'criminal_procedure',
  'crpc_amendment': 'criminal_procedure',
  'bsa': 'evidence',
  'indian_evidence_act': 'evidence',
  'juvenile_justice': 'special_laws',
  'ndps': 'special_laws',
  'pocs': 'special_laws'
};

// Law act full names
const actFullNames = {
  'BNS': 'Bharatiya Nyaya Sanhita, 2023',
  'BNSS': 'Bharatiya Nagarik Suraksha Sanhita, 2023',
  'BSA': 'Bharatiya Sakshya Adhiniyam, 2023',
  'IPC': 'Indian Penal Code, 1860',
  'CRPC': 'Criminal Procedure Code, 1973',
  'INDIAN_EVIDENCE_ACT': 'Indian Evidence Act, 1872',
  'JUVENILE_JUSTICE': 'Juvenile Justice (Care and Protection of Children) Act, 2015',
  'NDPS': 'Narcotic Drugs and Psychotropic Substances Act, 1985',
  'POCS': 'Protection of Children from Sexual Offences Act, 2012'
};

class LawMappingService {
  
  // Get the new law equivalent of an old law section
  getNewLawEquivalent(oldAct, sectionNumber) {
    const oldActUpper = oldAct.toUpperCase();
    
    switch (oldActUpper) {
      case 'IPC':
        return {
          newAct: 'BNS',
          newSection: lawMappings.ipcToBns[sectionNumber],
          fullName: actFullNames.BNS
        };
      case 'CRPC':
        return {
          newAct: 'BNSS',
          newSection: lawMappings.crpcToBnss[sectionNumber],
          fullName: actFullNames.BNSS
        };
      case 'INDIAN_EVIDENCE_ACT':
        return {
          newAct: 'BSA',
          newSection: lawMappings.evidenceToBsa[sectionNumber],
          fullName: actFullNames.BSA
        };
      default:
        return null;
    }
  }

  // Get the old law equivalent of a new law section
  getOldLawEquivalent(newAct, sectionNumber) {
    const newActUpper = newAct.toUpperCase();
    
    switch (newActUpper) {
      case 'BNS':
        return {
          oldAct: 'IPC',
          oldSection: bnsToIpc[sectionNumber],
          fullName: actFullNames.IPC
        };
      case 'BNSS':
        return {
          oldAct: 'CRPC',
          oldSection: bnssToCrpc[sectionNumber],
          fullName: actFullNames.CRPC
        };
      case 'BSA':
        return {
          oldAct: 'INDIAN_EVIDENCE_ACT',
          oldSection: bsaToEvidence[sectionNumber],
          fullName: actFullNames.INDIAN_EVIDENCE_ACT
        };
      default:
        return null;
    }
  }

  // Get replacement information for law conflicts
  getReplacement(act, sectionNumber) {
    const actUpper = act.toUpperCase();
    
    // If it's an old law, show the new replacement
    const newEquivalent = this.getNewLawEquivalent(actUpper, sectionNumber);
    if (newEquivalent && newEquivalent.newSection) {
      return `This section is replaced by ${newEquivalent.newAct} Section ${newEquivalent.newSection} under ${newEquivalent.fullName}`;
    }
    
    // If it's a new law, mention it replaces old law
    const oldEquivalent = this.getOldLawEquivalent(actUpper, sectionNumber);
    if (oldEquivalent && oldEquivalent.oldSection) {
      return `This section replaces ${oldEquivalent.oldAct} Section ${oldEquivalent.oldSection} from ${oldEquivalent.fullName}`;
    }
    
    return null;
  }

  // Get preferred law for a category
  getPreferredLaw(category) {
    return lawPreferences[category] || [];
  }

  // Check if law is outdated
  isLawOutdated(act) {
    const outdatedLaws = ['IPC', 'CRPC', 'INDIAN_EVIDENCE_ACT'];
    return outdatedLaws.includes(act.toUpperCase());
  }

  // Get law category from document type
  getLawCategory(documentType) {
    return documentTypeToCategory[documentType.toLowerCase()] || 'other';
  }

  // Get all sections for a specific act
  getAllSections(act) {
    const actUpper = act.toUpperCase();
    
    switch (actUpper) {
      case 'IPC':
        return Object.keys(lawMappings.ipcToBns);
      case 'BNS':
        return Object.keys(bnsToIpc);
      case 'CRPC':
        return Object.keys(lawMappings.crpcToBnss);
      case 'BNSS':
        return Object.keys(bnssToCrpc);
      case 'INDIAN_EVIDENCE_ACT':
        return Object.keys(lawMappings.evidenceToBsa);
      case 'BSA':
        return Object.keys(bsaToEvidence);
      default:
        return [];
    }
  }

  // Format law citation
  formatCitation(act, sectionNumber, title = '') {
    const actUpper = act.toUpperCase();
    const fullName = actFullNames[actUpper] || act;
    
    let citation = `${actUpper} Section ${sectionNumber}`;
    if (title) {
      citation += ` - ${title}`;
    }
    citation += ` (${fullName})`;
    
    // Add replacement information if applicable
    const replacement = this.getReplacement(act, sectionNumber);
    if (replacement) {
      citation += `\n${replacement}`;
    }
    
    return citation;
  }

  // Get conflicts between old and new laws
  getConflicts(sections) {
    const conflicts = [];
    
    sections.forEach(section => {
      const { act, sectionNumber } = section;
      const replacement = this.getReplacement(act, sectionNumber);
      
      if (replacement) {
        conflicts.push({
          original: section,
          replacement: replacement,
          isOutdated: this.isLawOutdated(act)
        });
      }
    });
    
    return conflicts;
  }

  // Normalize law references for consistent handling
  normalizeLawReference(act, sectionNumber) {
    const actUpper = act.toUpperCase();
    
    // Convert old law references to new ones
    const newEquivalent = this.getNewLawEquivalent(actUpper, sectionNumber);
    if (newEquivalent && newEquivalent.newSection) {
      return {
        act: newEquivalent.newAct,
        section: newEquivalent.newSection,
        isConverted: true,
        originalAct: actUpper,
        originalSection: sectionNumber
      };
    }
    
    return {
      act: actUpper,
      section: sectionNumber,
      isConverted: false
    };
  }
}

module.exports = {
  lawMappings: new LawMappingService(),
  actFullNames,
  lawPreferences,
  documentTypeToCategory
};