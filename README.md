# AutoCite

# Google Docs Citation Manager (AMS & AGU Styles)

This Google Apps Script automates the process of formatting in-text citations and generating a bibliography in **Google Docs**. It is specifically designed to support the strict formatting requirements of the **American Meteorological Society (AMS)** and the **American Geophysical Union (AGU)**.

By simply inserting a DOI or URL into a `\cite()` placeholder, the script will automatically fetch the article's metadata when you click the "Format Citations & Generate References" button, format the in-text citation, and build an alphabetized "References" section at the end of your document tailored to your chosen journal's style.

## Features

* **Custom Google Docs Menu:** Adds a convenient "Bibliography" menu to your Google Docs UI.

* **Smart Metadata Extraction:** Fetches citation data automatically using the DOI or Crossref APIs. It can extract DOIs directly from URLs or raw text, including legacy AMS SICI DOIs and standard Crossref DOIs.

* **Style-Specific In-Text Formatting:** 
  * **AMS:** Formats as `Smith et al. 2023`.
  * **AGU:** Formats with an APA-style comma as `Smith et al., 2023` (perfect for parenthetical citations like `(Smith et al., 2023)`).

* **Automated Bibliography Generation:** Appends an alphabetized "References" section to the end of the document with standard hanging indents.

* **Strict Style Compliance:**
  * **AMS:** Preserves specific AMS rules (italicized journal names, bolded volume numbers, specific author order).
  * **AGU:** Follows AGU's strict adaptation of APA style (e.g., all authors in reverse order `Last, Initials.`, limits lists of 8+ authors to the first six followed by `et al.`, italicizes volumes, and formats the year in parentheses).

* **Robust Parsing:** Built to bypass Google Docs' auto-hyperlinking issues and seamlessly handle nested parentheses within citation URLs.

## Installation

1. Open your Google Document.

2. In the top menu, click on **Extensions** > **Apps Script**.

3. Delete any code in the script editor and paste the provided script for your target journal (either the AMS version or the AGU version).

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
   * The script will replace your `\cite(...)` placeholders with the correct in-text citation format.
   * A **References** section will be created (or updated) at the bottom of your document.

### Output Examples

**AMS Style Output:**
* **In-text:** Smith and Jones 2021
* **Reference:** Smith, A., and B. Jones, 2021: Title of the paper. *J. Climate*, **34**, 123-145, https://doi.org/10.1175/JCLI-D-20-0123.1.

**AGU Style Output:**
* **In-text:** Smith & Jones, 2021
* **Reference:** Smith, A., & Jones, B. (2021). Title of the paper. *Journal of Geophysical Research: Atmospheres*, *126*(4), 123-145. https://doi.org/10.1029/2020JD012345

## Troubleshooting / Error Messages

If the script cannot find or process a citation, it will leave a visible error message in the document in place of the citation:

* `[CITATION NOT FOUND: {input}]`: The script could not resolve the DOI or URL to fetch the required metadata. Verify that the DOI/URL is correct and publicly available.

* `[MALFORMED CITE: MISSING ')' ]`: The script found `\cite(` but couldn't find the closing parenthesis.

## APIs Used

This script relies on the following external services to retrieve citation metadata:

* [dx.doi.org](https://doi.org/) (Content Negotiation for CSL JSON)
* [Crossref API](https://api.crossref.org/)
