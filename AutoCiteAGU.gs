/**
 * Creates a custom menu in Google Docs when the document is opened.
 */
function onOpen() {
  DocumentApp.getUi()
    .createMenu('Bibliography')
    .addItem('Format Citations & Generate References', 'processCitations')
    .addToUi();
}

/**
 * Main function to process citations and build the reference list.
 */
function processCitations() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  
  const usedReferences = new Map();
  const referenceCache = {}; 

  // We only search for the start of the citation to prevent Google Docs 
  // from breaking the search if the URL inside was auto-formatted as a hyperlink.
  let found = body.findText("\\\\cite\\(");

  while (found !== null) {
    const el = found.getElement();
    const parent = el.getParent();
    
    // Process the entire paragraph as a single, unified string to bypass hyperlink boundaries
    if (parent.editAsText) {
      const textElement = parent.editAsText();
      let fullText = textElement.getText();
      
      let start = fullText.indexOf("\\cite(");
      
      if (start !== -1) {
        let end = -1;
        let bracketCount = 0;
        
        // Manually parse forward to find the true closing parenthesis (handles nested brackets)
        for (let i = start + 5; i < fullText.length; i++) {
          if (fullText[i] === '(') bracketCount++;
          else if (fullText[i] === ')') {
            bracketCount--;
            if (bracketCount === 0) {
              end = i;
              break;
            }
          }
        }
        
        if (end !== -1) {
          const rawInput = fullText.substring(start + 6, end).trim();
          
          if (!referenceCache[rawInput]) {
            referenceCache[rawInput] = fetchMetadataForInput(rawInput);
          }
          
          const cslData = referenceCache[rawInput];
          
          if (cslData) {
            const finalDoi = cslData.DOI || rawInput;
            usedReferences.set(finalDoi, cslData);
            
            const inText = formatAGUInText(cslData);
            textElement.deleteText(start, end);
            textElement.insertText(start, inText);
          } else {
            const errorMsg = `[CITATION NOT FOUND: ${rawInput}]`;
            textElement.deleteText(start, end);
            textElement.insertText(start, errorMsg);
            textElement.setForegroundColor(start, start + errorMsg.length - 1, "#FF0000");
          }
        } else {
          // Fallback if the user typed \cite( but forgot the closing )
          textElement.deleteText(start, start + 5);
          textElement.insertText(start, "[MALFORMED CITE: MISSING ')' ]");
        }
      }
    }
    
    // Always restart the search from the top because editing the document shifts the text indices
    found = body.findText("\\\\cite\\(");
  }

  // Generate the new References and append them
  if (usedReferences.size > 0) {
    appendReferencesSection(body, Array.from(usedReferences.values()));
  }
  
  // FINALLY: Ensure the entire References section is completely alphabetized
  sortExistingReferences(body);
}

/**
 * Robust extraction engine: tries regex, stripping versions, and web scraping
 */
function fetchMetadataForInput(input) {
  input = input.trim();
  let cslData = null;
  
  let potentialDoi = extractDirectDoi(input);
  if (potentialDoi) {
    cslData = fetchDoiMetadata(potentialDoi);
    if (cslData) return cslData;
    
    if (potentialDoi.match(/\.\d+$/)) {
      let strippedDoi = potentialDoi.replace(/\.\d+$/, "");
      cslData = fetchDoiMetadata(strippedDoi);
      if (cslData) return cslData;
    }
  }
  
  if (input.startsWith("http://") || input.startsWith("https://")) {
    let cleanUrl = input.replace(/\.xml$/, "").replace(/\.pdf$/, "");
    let scrapedDoi = resolveDoiFromUrl(cleanUrl);
    
    if (scrapedDoi) {
      cslData = fetchDoiMetadata(scrapedDoi);
      if (cslData) return cslData;
    }
    
    if (cleanUrl !== input) {
      scrapedDoi = resolveDoiFromUrl(input);
      if (scrapedDoi) {
        cslData = fetchDoiMetadata(scrapedDoi);
        if (cslData) return cslData;
      }
    }
  }
  
  return null; 
}

/**
 * Attempts to parse a DOI string out of URLs or raw inputs
 */
function extractDirectDoi(input) {
  if (input.startsWith("10.")) return input;
  if (input.includes("doi.org/")) return input.split("doi.org/")[1].split("?")[0].trim();
  
  if (input.includes("journals.ametsoc.org")) {
    const amsMatch = input.match(/([A-Za-z0-9]+-[A-Za-z0-9]+-\d{2}-\d+(?:\.\d+)?)/i);
    if (amsMatch) return "10.1175/" + amsMatch[1];
    
    const legacyMatch = input.match(/(\d{4}-\d{3}[0-9xX])_(\d{4})_(\d+)_(\d+)_([a-z0-9]+)_2_0_co_(\d+)/i);
    if (legacyMatch) {
      const issn = legacyMatch[1];
      const year = legacyMatch[2];
      const vol = legacyMatch[3];
      const page = legacyMatch[4];
      const code = legacyMatch[5].toUpperCase();
      const version = legacyMatch[6];
      return `10.1175/${issn}(${year})${vol}<${page}:${code}>2.0.CO;${version}`;
    }
  }
  
  // Catch-all general DOI regex
  const doiMatch = input.match(/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i);
  if (doiMatch) return doiMatch[1];
  
  return null;
}

function resolveDoiFromUrl(url) {
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      const match = html.match(/<meta[^>]+(?:name|property)=["'](?:citation_doi|dc\.identifier)["'][^>]+content=["']([^"']+)["']/i) 
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:citation_doi|dc\.identifier)["']/i);
      
      if (match && match[1]) {
        let extracted = match[1].trim();
        if (extracted.includes('doi.org/')) extracted = extracted.split('doi.org/')[1];
        if (extracted.startsWith('doi:')) extracted = extracted.substring(4);
        return extracted;
      }
    }
  } catch (e) {}
  return null;
}

function fetchDoiMetadata(doi) {
  let url = "https://doi.org/" + encodeURIComponent(doi);
  let options = {
    method: "get",
    headers: { "Accept": "application/vnd.citationstyles.csl+json" },
    muteHttpExceptions: true,
    followRedirects: true
  };
  
  try {
    let response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      return JSON.parse(response.getContentText());
    }
  } catch (e) {}
  
  url = "https://api.crossref.org/works/" + encodeURIComponent(doi) + "/transform/application/vnd.citationstyles.csl+json";
  try {
    let response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    }
  } catch (e) {}
  
  return null;
}

function getYear(cslData) {
  if (cslData.issued && cslData.issued['date-parts'] && cslData.issued['date-parts'][0]) {
    return cslData.issued['date-parts'][0][0];
  }
  return "n.d.";
}

function formatAGUInText(cslData) {
  const authors = cslData.author || [];
  const year = getYear(cslData);
  let text = 'Unknown';
  
  if (authors.length === 1) {
    text = authors[0].family || "Unknown";
  } else if (authors.length === 2) {
    text = `${authors[0].family || "Unknown"} & ${authors[1].family || "Unknown"}`;
  } else if (authors.length >= 3) {
    text = `${authors[0].family || "Unknown"} et al.`;
  }
  
  return `${text}, ${year}`;
}

function getInitials(givenName) {
  if (!givenName) return "";
  return givenName.trim().split(/[\s-]+/).map(part => part.charAt(0).toUpperCase() + ".").join(" ");
}

function formatAGUReferenceAuthors(authorsArray) {
  if (!authorsArray || authorsArray.length === 0) return "Unknown Author";

  const formatted = authorsArray.map((author) => {
    const family = author.family || "";
    const initials = getInitials(author.given);
    
    // AGU/APA Style: All authors' initials and surnames are given in reverse order
    return initials ? `${family}, ${initials}` : family;
  });

  if (formatted.length === 1) return formatted[0];
  
  // For two to seven authors, use a comma then an ampersand before the final author.
  if (formatted.length <= 7) {
    const lastAuthor = formatted.pop();
    return `${formatted.join(', ')}, & ${lastAuthor}`;
  } else {
    // AGU Exception: For eight or more authors, include the first six names followed by "et al."
    const firstSix = formatted.slice(0, 6);
    return `${firstSix.join(', ')}, et al.`;
  }
}

function appendReferencesSection(body, references) {
  let hasReferencesSection = false;
  const paragraphs = body.getParagraphs();
  
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const p = paragraphs[i];
    if (p.getText().trim() === "References" && 
        p.getHeading() === DocumentApp.ParagraphHeading.HEADING1) {
      hasReferencesSection = true;
      break;
    }
  }

  if (!hasReferencesSection) {
    body.appendPageBreak();
    body.appendParagraph("References")
        .setHeading(DocumentApp.ParagraphHeading.HEADING1)
        .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }

  references.forEach(cslData => {
    // Avoid duplicating entries that are already in the References section
    if (cslData.DOI && body.getText().toLowerCase().includes(`doi.org/${cslData.DOI.toLowerCase()}`)) return; 

    const authors = formatAGUReferenceAuthors(cslData.author);
    const year = getYear(cslData);
    let title = cslData.title || "Unknown Title";
    
    // AGU formatting requires full periodical titles - do not abbreviate
    const journal = (cslData['container-title'] || "").trim();
    const publisher = (cslData.publisher || "").trim(); 
    
    // Strip trailing period from JSON title to prevent double punctuation
    if (title.endsWith(".")) {
      title = title.slice(0, -1);
    }
    
    // Base layout: Authors (Year). Title.
    let refString = `${authors} (${year}). ${title}.`;
    let journalStart = -1, journalEnd = -1, volStart = -1, volEnd = -1;
    
    if (journal) {
      refString += " ";
      journalStart = refString.length;
      refString += journal;
      journalEnd = refString.length - 1;
      
      if (cslData.volume) {
        refString += ", ";
        volStart = refString.length;
        refString += String(cslData.volume);
        volEnd = refString.length - 1;
        
        if (cslData.issue) {
          refString += `(${cslData.issue})`;
        }
      }
      
      if (cslData.page) {
        refString += `, ${cslData.page}`;
      }
      
      refString += ".";
    } else if (publisher) {
       // Fallback logic for books/reports without a periodical title
       refString += ` ${publisher}.`;
    }
    
    if (cslData.DOI) {
      // AGU formatting explicitly states there is no period after the DOI
      refString += ` https://doi.org/${cslData.DOI}`;
    }
    
    const p = body.appendParagraph(refString);
    
    // AGU standard hanging indent: Flush left on first line, indent subsequent lines
    p.setIndentFirstLine(0); 
    p.setIndentStart(36); 
    
    const textElement = p.editAsText();
    // Italicize journal titles and volume numbers
    if (journalStart !== -1 && journalEnd >= journalStart) textElement.setItalic(journalStart, journalEnd, true);
    if (volStart !== -1 && volEnd >= volStart) textElement.setItalic(volStart, volEnd, true);
  });
}

/**
 * Sweeps the entire References section, sorts all paragraphs alphabetically by text, 
 * and rewrites them into the document while strictly preserving italic formatting.
 */
function sortExistingReferences(body) {
  const paragraphs = body.getParagraphs();
  let headerElement = null;
  
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const p = paragraphs[i];
    if (p.getText().trim() === "References" && 
        p.getHeading() === DocumentApp.ParagraphHeading.HEADING1) {
      headerElement = p;
      break;
    }
  }
  
  if (!headerElement) return;
  
  const headerIndex = body.getChildIndex(headerElement);
  const numChildren = body.getNumChildren();
  
  let refData = [];
  let elementsToDelete = [];
  
  for (let i = headerIndex + 1; i < numChildren; i++) {
    const child = body.getChild(i);
    
    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      const p = child.asParagraph();
      const text = p.getText().trim();
      
      if (p.getHeading() === DocumentApp.ParagraphHeading.HEADING1 && text !== "") {
        break;
      }
      
      if (text.length > 0) {
        refData.push({ text: text, paragraphCopy: p.copy() });
      }
      elementsToDelete.push(p);
    }
  }
  
  if (refData.length === 0) return;
  
  // ALphabetize literally
  refData.sort((a, b) => a.text.localeCompare(b.text));
  
  let insertIndex = headerIndex + 1;
  refData.forEach(item => {
    if (insertIndex >= body.getNumChildren()) {
      body.appendParagraph(item.paragraphCopy);
    } else {
      body.insertParagraph(insertIndex, item.paragraphCopy);
    }
    insertIndex++;
  });
  
  elementsToDelete.forEach(p => {
    try {
      p.removeFromParent();
    } catch (e) {
      p.clear(); 
    }
  });
}
