/**
 * LinkedIn Profile Scraper - Based on scraping_rules.txt
 * Follows the exact process outlined in the scraping rules section
 */

class LinkedInScraper {
  async scrapeAndClean() {
    // Scroll to load all lazy-loaded content
    for (let i = 0; i < 5; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Extract all text from main content area
    const main = document.querySelector('main') || document.body;
    let text = main.innerText || main.textContent || '';

    // Separate it into an array by \n character (keep empty items - they're significant)
    let lines = text.split('\n');

    // The first word in the first item is the person's first name
    const firstName = lines[0] ? lines[0].split(' ')[0] : '';

    // Find the Skills section
    let skillsIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Skills' && 
          i > 0 && lines[i-1].trim() === '' && 
          i < lines.length - 1 && lines[i+1].trim() === '') {
        skillsIndex = i;
        break;
      }
    }

    // If no Skills section found, look for Recommendations section
    let cutoffIndex = -1;
    if (skillsIndex !== -1) {
      cutoffIndex = skillsIndex;
    } else {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === 'Recommendations' && 
            i < lines.length - 1 && 
            lines[i+1].includes(`Recommend ${firstName}`)) {
          cutoffIndex = i;
          break;
        }
      }
    }

    // Get rid of everything up to and including the cutoff section
    let relevantLines = cutoffIndex !== -1 ? lines.slice(0, cutoffIndex) : lines;

    // Determine what sections are present and where each starts and ends
    let sections = this.identifySections(relevantLines);

    // Process sections according to rules
    let cleanedLines = [];

    // Keep the entire first section (header info)
    if (sections.header) {
      cleanedLines = cleanedLines.concat(relevantLines.slice(sections.header.start, sections.header.end));
    }

    // If there is a Highlights section, get rid of all of those items
    if (sections.highlights) {
      // Skip highlights section entirely
    }

    // If there is an activity section, get rid of all of the activity section's items
    if (sections.activity) {
      // Skip activity section entirely
    }

    // Keep the About section (don't try to parse it)
    if (sections.about) {
      cleanedLines = cleanedLines.concat(relevantLines.slice(sections.about.start, sections.about.end));
    }

    // Keep the experience section (don't try to parse it)
    if (sections.experience) {
      cleanedLines = cleanedLines.concat(relevantLines.slice(sections.experience.start, sections.experience.end));
    }

    // Keep the education section (don't try to parse it)
    if (sections.education) {
      cleanedLines = cleanedLines.concat(relevantLines.slice(sections.education.start, sections.education.end));
    }

    // Extract name for filename
    const nameLine = lines[0] || '';
    const nameParts = nameLine.trim().split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const cleanName = `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9_]/g, '');

    // Apply additional filtering rules to the first section
    if (sections.header) {
      let headerLines = cleanedLines.slice(0, sections.header.end);
      headerLines = headerLines.filter(line => {
        const trimmed = line.trim();
        
        // Remove pronouns (case insensitive)
        if (/^(he\/him|she\/her|they\/them)$/i.test(trimmed)) return false;
        
        // Remove bullet points
        if (trimmed.startsWith('·')) return false;
        
        // Remove "Contact info"
        if (trimmed === 'Contact info') return false;
        
        // Remove follower counts
        if (/^\d[,\d]* followers$/i.test(trimmed)) return false;
        
        // Remove connection counts
        if (/^\d[,\d]*\+? connections$/i.test(trimmed)) return false;
        
        // Remove mutual connections text
        if (/mutual connections?$/.test(trimmed)) return false;
        
        // Remove just "Message"
        if (trimmed === 'Message') return false;
        
        return true;
      });
      
      // Replace the header section with filtered version
      cleanedLines = headerLines.concat(cleanedLines.slice(sections.header.end));
    }

    // At the end of processing, get rid of all lines that are "… more"
    cleanedLines = cleanedLines.filter(line => line.trim() !== '… more');

    // If there is an item that is only "Licenses & certifications", get rid of it and everything after it
    const licensesIndex = cleanedLines.findIndex(line => line.trim() === 'Licenses & certifications');
    if (licensesIndex !== -1) {
      cleanedLines = cleanedLines.slice(0, licensesIndex);
    }

    // If there is a line that starts with "·" in the first 5 items, get rid of it as well
    if (cleanedLines.length >= 5) {
      const firstFive = cleanedLines.slice(0, 5);
      const bulletIndex = firstFive.findIndex(line => line.trim().startsWith('·'));
      if (bulletIndex !== -1) {
        // Remove the bullet line
        cleanedLines.splice(bulletIndex, 1);
      }
    }

    // Remove "Profile enhanced with Premium", "Book an appointment", and "Show all" lines
    cleanedLines = cleanedLines.filter(line => {
      const trimmed = line.trim();
      return trimmed !== 'Profile enhanced with Premium' && 
             trimmed !== 'Book an appointment' && 
             trimmed !== 'Show all';
    });

    // Return the cleaned text (no longer downloading)
    return cleanedLines.join('\n');
  }

  identifySections(lines) {
    let sections = {
      header: { start: 0, end: 0 },
      highlights: null,
      about: null,
      services: null,
      featured: null,
      activity: null,
      experience: null,
      education: null
    };

    let currentSection = 'header';
    let headerEnd = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for section headers
      if (line === 'Highlights') {
        sections.header.end = i;
        headerEnd = i;
        sections.highlights = { start: i, end: i };
        currentSection = 'highlights';
      } else if (line === 'About') {
        if (sections.highlights) {
          sections.highlights.end = i;
        } else {
          sections.header.end = i;
          headerEnd = i;
        }
        sections.about = { start: i, end: i };
        currentSection = 'about';
      } else if (line === 'Services') {
        if (sections.about) {
          sections.about.end = i;
        } else if (sections.highlights) {
          sections.highlights.end = i;
        } else {
          sections.header.end = i;
          headerEnd = i;
        }
        sections.services = { start: i, end: i };
        currentSection = 'services';
      } else if (line === 'Featured') {
        if (sections.services) {
          sections.services.end = i;
        } else if (sections.about) {
          sections.about.end = i;
        } else if (sections.highlights) {
          sections.highlights.end = i;
        } else {
          sections.header.end = i;
          headerEnd = i;
        }
        sections.featured = { start: i, end: i };
        currentSection = 'featured';
      } else if (line === 'Activity') {
        if (sections.featured) {
          sections.featured.end = i;
        } else if (sections.services) {
          sections.services.end = i;
        } else if (sections.about) {
          sections.about.end = i;
        } else if (sections.highlights) {
          sections.highlights.end = i;
        } else {
          sections.header.end = i;
          headerEnd = i;
        }
        sections.activity = { start: i, end: i };
        currentSection = 'activity';
      } else if (line === 'Experience') {
        if (sections.activity) {
          sections.activity.end = i;
        } else if (sections.featured) {
          sections.featured.end = i;
        } else if (sections.services) {
          sections.services.end = i;
        } else if (sections.about) {
          sections.about.end = i;
        } else if (sections.highlights) {
          sections.highlights.end = i;
        } else {
          sections.header.end = i;
          headerEnd = i;
        }
        sections.experience = { start: i, end: i };
        currentSection = 'experience';
      } else if (line === 'Education') {
        if (sections.experience) {
          sections.experience.end = i;
        } else if (sections.activity) {
          sections.activity.end = i;
        } else if (sections.featured) {
          sections.featured.end = i;
        } else if (sections.services) {
          sections.services.end = i;
        } else if (sections.about) {
          sections.about.end = i;
        } else if (sections.highlights) {
          sections.highlights.end = i;
        } else {
          sections.header.end = i;
          headerEnd = i;
        }
        sections.education = { start: i, end: i };
        currentSection = 'education';
      } else if (line === 'Skills' || line === 'Recommendations') {
        // End the current section
        if (currentSection === 'education' && sections.education) {
          sections.education.end = i;
        } else if (currentSection === 'experience' && sections.experience) {
          sections.experience.end = i;
        } else if (currentSection === 'activity' && sections.activity) {
          sections.activity.end = i;
        } else if (currentSection === 'featured' && sections.featured) {
          sections.featured.end = i;
        } else if (currentSection === 'services' && sections.services) {
          sections.services.end = i;
        } else if (currentSection === 'about' && sections.about) {
          sections.about.end = i;
        } else if (currentSection === 'highlights' && sections.highlights) {
          sections.highlights.end = i;
        } else {
          sections.header.end = i;
          headerEnd = i;
        }
        break;
      }
    }

    // If we never found a proper end for the last section, set it to the end of lines
    if (sections.education && sections.education.end === sections.education.start) {
      sections.education.end = lines.length;
    } else if (sections.experience && sections.experience.end === sections.experience.start) {
      sections.experience.end = lines.length;
    } else if (sections.activity && sections.activity.end === sections.activity.start) {
      sections.activity.end = lines.length;
    } else if (sections.featured && sections.featured.end === sections.featured.start) {
      sections.featured.end = lines.length;
    } else if (sections.services && sections.services.end === sections.services.start) {
      sections.services.end = lines.length;
    } else if (sections.about && sections.about.end === sections.about.start) {
      sections.about.end = lines.length;
    } else if (sections.highlights && sections.highlights.end === sections.highlights.start) {
      sections.highlights.end = lines.length;
    } else if (sections.header.end === 0) {
      sections.header.end = lines.length;
    }

    return sections;
  }
}

window.LinkedInScraper = LinkedInScraper;
