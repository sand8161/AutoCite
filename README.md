# AutoCite

This Google Apps Script automates the process of formatting in-text citations and generating a bibliography in **Google Docs**, specifically tailored to the **American Meteorological Society (AMS)** citation style. 

By simply inserting a DOI or URL into a `\cite()` placeholder, the script will automatically fetch the article's metadata, format the in-text citation, and build an alphabetized "References" section at the end of your document.

## Features

* **Custom Google Docs Menu:** Adds a convenient "Bibliography" menu to your Google Docs UI.
* **Smart Metadata Extraction:** Fetches citation data automatically using the DOI or Crossref APIs. It can extract DOIs directly from URLs or raw text, including both modern and legacy AMS SICI DOIs.
* **AMS In-Text Formatting:** Replaces your placeholders with properly formatted AMS in-text citations (e.g., *Smith 2023*, *Smith and Jones 2023*, *Smith et al. 2023*).
* **Automated Bibliography Generation:** Appends a "References" section to the end of the document with hanging indents.
* **Smart Sorting & Formatting:** Alphabetizes the reference list automatically while strictly preserving AMS formatting rules (italicized journal names, bolded volume numbers).
* **Robust Parsing:** Built to bypass Google Docs' auto-hyperlinking issues and seamlessly handle nested parentheses within citation URLs.

## Installation

1. Open your Google Document.
2. In the top menu, click on **Extensions** > **Apps Script**.
3. Delete any code in the script editor and paste the provided script.
4. Click the **Save** icon (or press `Ctrl+S` / `Cmd+S`).
5. Close the Apps Script tab and refresh your Google Document.
6. A new menu item named **Bibliography** will appear in the top menu bar (this usually takes a few seconds to load).

*Note: The first time you run the script, Google will ask you to authorize it. This is required because the script needs permission to edit your document and connect to external APIs (like Crossref) to fetch citation metadata.*

## Usage

1. **Insert Placeholders:** While writing your document, insert citations using the `\cite()` syntax. You can place a direct DOI or a web URL inside the parentheses.
   * *Example (DOI):* `The climate model showed significant changes \cite(10.1175/JCLI-D-20-0123.1).`
   * *Example (URL):* `Recent studies \cite(https://journals.ametsoc.org/view/journals/clim/34/12/JCLI-D-20-0123.1.xml) confirm this.`
2. **Process Citations:** Once you are ready to format your citations, go to the top menu and click **Bibliography** > **Format Citations & Generate References**.
3. **Review Results:** 
   * The script will replace your `\cite(...)` placeholders with the correct AMS in-text citation (e.g., `Smith et al. 2021`).
   * A **References** section will be created (or updated) at the bottom of your document containing the full, alphabetized citations.

## Troubleshooting / Error Messages

If the script cannot find or process a citation, it will leave a visible error message in the document in place of the citation:
* `[CITATION NOT FOUND: {input}]`: The script could not resolve the DOI or URL to fetch the required metadata. Verify that the DOI/URL is correct and publicly available.
* `[MALFORMED CITE: MISSING ')' ]`: The script found `\cite(` but couldn't find the closing parenthesis. 

## APIs Used
This script relies on the following external services to retrieve citation metadata:
* [dx.doi.org](https://doi.org/) (Content Negotiation for CSL JSON)
* [Crossref API](https://api.crossref.org/)
