(function () {
  "use strict";

  var rootUrl = "https://sira-452b7.web.app";
  var orgId = rootUrl + "/#organization";
  var websiteId = rootUrl + "/#website";

  function breadcrumb(path, label) {
    return {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": rootUrl + "/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": label,
          "item": rootUrl + path
        }
      ]
    };
  }

  function baseGraph(pageUrl, pageTitle, pageDescription) {
    return [
      {
        "@type": "Organization",
        "@id": orgId,
        "name": "SiRa Convert",
        "url": rootUrl + "/",
        "logo": {
          "@type": "ImageObject",
          "url": rootUrl + "/logo.png"
        }
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        "name": "SiRa Convert",
        "url": rootUrl + "/",
        "inLanguage": "en-US",
        "publisher": {
          "@id": orgId
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": rootUrl + "/blog.html?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "name": pageTitle,
        "url": pageUrl,
        "description": pageDescription,
        "isPartOf": {
          "@id": websiteId
        },
        "about": {
          "@id": orgId
        },
        "inLanguage": "en-US"
      }
    ];
  }

  var byPath = {
    "/": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var graph = baseGraph(
          rootUrl + "/",
          "SiRa Convert | Professional Document Suite",
          "Private browser-based suite to convert JPG to PDF, PDF to JPG, and merge PDF files."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser, Android, iOS, Windows, macOS",
          "description": "Private browser-based suite to convert JPG to PDF, PDF to JPG, and merge PDF files.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "url": rootUrl + "/"
        });
        graph.push({
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Is SiRa Convert free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Core tools are available without paid setup and can be used directly from your browser."
              }
            },
            {
              "@type": "Question",
              "name": "Which file tasks are available right now?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "You can convert JPG to PDF, convert PDF to JPG, and merge multiple PDF files."
              }
            },
            {
              "@type": "Question",
              "name": "Where can I read product updates?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Visit the SiRa Convert blog for release notes, reliability updates, and roadmap items."
              }
            }
          ]
        });
        return graph;
      })()
    },
    "/index.html": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var graph = baseGraph(
          rootUrl + "/",
          "SiRa Convert | Professional Document Suite",
          "Private browser-based suite to convert JPG to PDF, PDF to JPG, and merge PDF files."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser, Android, iOS, Windows, macOS",
          "description": "Private browser-based suite to convert JPG to PDF, PDF to JPG, and merge PDF files.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "url": rootUrl + "/"
        });
        graph.push({
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Is SiRa Convert free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Core tools are available without paid setup and can be used directly from your browser."
              }
            },
            {
              "@type": "Question",
              "name": "Which file tasks are available right now?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "You can convert JPG to PDF, convert PDF to JPG, and merge multiple PDF files."
              }
            },
            {
              "@type": "Question",
              "name": "Where can I read product updates?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Visit the SiRa Convert blog for release notes, reliability updates, and roadmap items."
              }
            }
          ]
        });
        return graph;
      })()
    },
    "/jpg-to-pdf.html": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var pagePath = "/jpg-to-pdf.html";
        var graph = baseGraph(
          rootUrl + pagePath,
          "JPG to PDF | SiRa Convert",
          "Convert JPG, PNG, and WEBP images to high-quality PDF in-browser with advanced quality controls."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert JPG to PDF",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser",
          "url": rootUrl + pagePath,
          "description": "Convert JPG, PNG, and WEBP images to high-quality PDF in-browser with advanced quality controls.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "isPartOf": {
            "@id": websiteId
          }
        });
        graph.push({
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Can I convert PNG and WEBP files as well?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. The tool accepts JPG, PNG, and WEBP and combines them into one PDF in your selected order."
              }
            },
            {
              "@type": "Question",
              "name": "Can I keep high image quality in the PDF?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Use the quality and compression controls to keep output clarity high, especially for printing."
              }
            },
            {
              "@type": "Question",
              "name": "Can I rearrange pages before export?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Reorder images in the queue before conversion so final PDF pages match your preferred sequence."
              }
            }
          ]
        });
        graph.push(breadcrumb(pagePath, "JPG to PDF"));
        return graph;
      })()
    },
    "/pdf-to-jpg.html": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var pagePath = "/pdf-to-jpg.html";
        var graph = baseGraph(
          rootUrl + pagePath,
          "PDF to JPG | SiRa Convert",
          "Convert PDF pages to JPG or PNG in-browser with high quality output, ZIP export, and private processing."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert PDF to JPG",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser",
          "url": rootUrl + pagePath,
          "description": "Convert PDF pages to JPG or PNG in-browser with high quality output, ZIP export, and private processing.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "isPartOf": {
            "@id": websiteId
          }
        });
        graph.push({
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Can I convert only selected pages from a PDF?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Enter page ranges such as 1-4,7 to convert only the pages you need."
              }
            },
            {
              "@type": "Question",
              "name": "Should I choose JPG or PNG output?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "JPG is better for smaller files. PNG is better for lossless quality and graphics with text edges."
              }
            },
            {
              "@type": "Question",
              "name": "Can I batch download converted images?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. You can export all output images in a ZIP file for faster downloads."
              }
            }
          ]
        });
        graph.push(breadcrumb(pagePath, "PDF to JPG"));
        return graph;
      })()
    },
    "/merge-pdf.html": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var pagePath = "/merge-pdf.html";
        var graph = baseGraph(
          rootUrl + pagePath,
          "Merge PDF | SiRa Convert",
          "Merge multiple PDF files into one high-quality output in your browser with private processing."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert Merge PDF",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser",
          "url": rootUrl + pagePath,
          "description": "Merge multiple PDF files into one high-quality output in your browser with private processing.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "isPartOf": {
            "@id": websiteId
          }
        });
        graph.push({
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Does merge order follow my selected queue?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. The final merged document follows the exact queue order shown before processing."
              }
            },
            {
              "@type": "Question",
              "name": "Can I skip locked or invalid PDF files?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Enable the skip option to continue merging valid files while ignoring protected or unreadable inputs."
              }
            },
            {
              "@type": "Question",
              "name": "Can I rename the merged PDF output?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Set a custom output filename in the controls before downloading."
              }
            }
          ]
        });
        graph.push(breadcrumb(pagePath, "Merge PDF"));
        return graph;
      })()
    },
    "/about.html": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var pagePath = "/about.html";
        var graph = baseGraph(
          rootUrl + pagePath,
          "About | SiRa Convert",
          "About SiRa Convert, a browser-based document conversion toolkit."
        );
        graph.push({
          "@type": "AboutPage",
          "name": "About SiRa Convert",
          "url": rootUrl + pagePath,
          "mainEntity": {
            "@type": "Person",
            "name": "Raghav Pratap"
          }
        });
        graph.push({
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is the main goal of SiRa Convert?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "The main goal is to provide fast and straightforward online document tools with a consistent interface across devices."
              }
            },
            {
              "@type": "Question",
              "name": "Who is SiRa Convert designed for?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Students, professionals, and creators who need simple PDF and image conversion tools without complex setup."
              }
            }
          ]
        });
        graph.push(breadcrumb(pagePath, "About"));
        return graph;
      })()
    },
    "/blog.html": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var pagePath = "/blog.html";
        var graph = baseGraph(
          rootUrl + pagePath,
          "Blog | SiRa Convert",
          "Updates and product notes from SiRa Convert."
        );
        graph.push({
          "@type": "Blog",
          "name": "SiRa Convert Blog",
          "url": rootUrl + pagePath,
          "author": {
            "@type": "Person",
            "name": "Raghav Pratap"
          }
        });
        graph.push({
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "How often is the blog updated?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Updates are posted when major product improvements, fixes, and roadmap milestones are released."
              }
            },
            {
              "@type": "Question",
              "name": "Does the blog include practical usage tips?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Posts include workflow recommendations that help users complete conversions and merges more efficiently."
              }
            }
          ]
        });
        graph.push(breadcrumb(pagePath, "Blog"));
        return graph;
      })()
    },
    "/privacy.html": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var pagePath = "/privacy.html";
        var graph = baseGraph(
          rootUrl + pagePath,
          "Privacy Policy | SiRa Convert",
          "Privacy policy and data handling practices for SiRa Convert."
        );
        graph.push({
          "@type": "WebPage",
          "name": "Privacy Policy - SiRa Convert",
          "url": rootUrl + pagePath,
          "publisher": {
            "@id": orgId
          }
        });
        graph.push(breadcrumb(pagePath, "Privacy Policy"));
        return graph;
      })()
    },
    "/terms.html": {
      "@context": "https://schema.org",
      "@graph": (function () {
        var pagePath = "/terms.html";
        var graph = baseGraph(
          rootUrl + pagePath,
          "Terms of Use | SiRa Convert",
          "Terms of use for SiRa Convert and related services."
        );
        graph.push({
          "@type": "WebPage",
          "name": "Terms of Use - SiRa Convert",
          "url": rootUrl + pagePath,
          "publisher": {
            "@id": orgId
          }
        });
        graph.push(breadcrumb(pagePath, "Terms of Use"));
        return graph;
      })()
    }
  };

  var path = window.location.pathname || "/";
  var data = byPath[path] || byPath["/"];
  if (!data) return;

  var script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
})();
