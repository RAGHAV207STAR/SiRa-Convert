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
          "SiRa Convert | Free Online JPG to PDF, PDF to JPG & Merge PDF Tool",
          "Convert JPG to PDF, PDF to JPG, and merge PDF files online in seconds with private browser-first workflows."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser, Android, iOS, Windows, macOS",
          "description": "Convert JPG to PDF, PDF to JPG, and merge PDF files online in seconds with private browser-first workflows.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "url": rootUrl + "/"
        });
        graph.push({
          "@type": "FAQPage",
          "name": "SiRa Convert FAQ",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Is SiRa Convert free for regular use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Core tools are free to use with no account required for standard browser-based conversion and merge workflows."
              }
            },
            {
              "@type": "Question",
              "name": "Which tasks can I complete on this website?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "You can convert images to PDF, convert PDF pages to JPG or PNG, and merge multiple PDFs into a single output document."
              }
            },
            {
              "@type": "Question",
              "name": "Can I use SiRa Convert on mobile devices?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. The interface is responsive for phones, tablets, and desktops, so uploads, previews, and downloads work across screen sizes."
              }
            },
            {
              "@type": "Question",
              "name": "How do I follow new updates and improvements?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Visit the SiRa Convert blog for release notes, conversion tips, and product improvement announcements."
              }
            },
            {
              "@type": "Question",
              "name": "Where can I convert PDF to JPG directly?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Use the dedicated PDF to JPG converter page for page-range extraction, quality controls, and ZIP export."
              }
            },
            {
              "@type": "Question",
              "name": "Where can I convert JPG to PDF directly?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Use the dedicated JPG to PDF converter page to combine images into one PDF with layout controls."
              }
            },
            {
              "@type": "Question",
              "name": "Where can I merge PDF files directly?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Use the dedicated Merge PDF page to combine multiple PDFs in your chosen order."
              }
            }
          ]
        });
        graph.push({
          "@type": "ItemList",
          "name": "SiRa Convert Tools",
          "itemListOrder": "https://schema.org/ItemListOrderAscending",
          "numberOfItems": 3,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "JPG to PDF Converter",
              "url": rootUrl + "/jpg-to-pdf.html"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "PDF to JPG Converter",
              "url": rootUrl + "/pdf-to-jpg.html"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "Merge PDF Tool",
              "url": rootUrl + "/merge-pdf.html"
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
          "SiRa Convert | Free Online JPG to PDF, PDF to JPG & Merge PDF Tool",
          "Convert JPG to PDF, PDF to JPG, and merge PDF files online in seconds with private browser-first workflows."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser, Android, iOS, Windows, macOS",
          "description": "Convert JPG to PDF, PDF to JPG, and merge PDF files online in seconds with private browser-first workflows.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "url": rootUrl + "/"
        });
        graph.push({
          "@type": "FAQPage",
          "name": "SiRa Convert FAQ",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Is SiRa Convert free for regular use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Core tools are free to use with no account required for standard browser-based conversion and merge workflows."
              }
            },
            {
              "@type": "Question",
              "name": "Which tasks can I complete on this website?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "You can convert images to PDF, convert PDF pages to JPG or PNG, and merge multiple PDFs into a single output document."
              }
            },
            {
              "@type": "Question",
              "name": "Can I use SiRa Convert on mobile devices?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. The interface is responsive for phones, tablets, and desktops, so uploads, previews, and downloads work across screen sizes."
              }
            },
            {
              "@type": "Question",
              "name": "How do I follow new updates and improvements?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Visit the SiRa Convert blog for release notes, conversion tips, and product improvement announcements."
              }
            },
            {
              "@type": "Question",
              "name": "Where can I convert PDF to JPG directly?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Use the dedicated PDF to JPG converter page for page-range extraction, quality controls, and ZIP export."
              }
            },
            {
              "@type": "Question",
              "name": "Where can I convert JPG to PDF directly?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Use the dedicated JPG to PDF converter page to combine images into one PDF with layout controls."
              }
            },
            {
              "@type": "Question",
              "name": "Where can I merge PDF files directly?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Use the dedicated Merge PDF page to combine multiple PDFs in your chosen order."
              }
            }
          ]
        });
        graph.push({
          "@type": "ItemList",
          "name": "SiRa Convert Tools",
          "itemListOrder": "https://schema.org/ItemListOrderAscending",
          "numberOfItems": 3,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "JPG to PDF Converter",
              "url": rootUrl + "/jpg-to-pdf.html"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "PDF to JPG Converter",
              "url": rootUrl + "/pdf-to-jpg.html"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "Merge PDF Tool",
              "url": rootUrl + "/merge-pdf.html"
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
          "JPG to PDF Converter Online | Free, High Quality & Private | SiRa Convert",
          "Convert JPG, PNG, and WEBP to PDF online with page order, margin, and quality controls."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert JPG to PDF",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser",
          "url": rootUrl + pagePath,
          "description": "Convert JPG, PNG, and WEBP to PDF online with page order, margin, and quality controls.",
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
          "name": "JPG to PDF FAQ",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Can I combine JPG, PNG, and WEBP in one PDF?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. You can mix supported image formats and create one PDF while preserving your selected page order."
              }
            },
            {
              "@type": "Question",
              "name": "How do I keep image quality high in the output PDF?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Choose higher quality settings, review image dimensions in preview, and use suitable margins for cleaner print output."
              }
            },
            {
              "@type": "Question",
              "name": "Can I rearrange pages before I download?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Drag and reorder images in the queue so the generated PDF follows your exact sequence."
              }
            },
            {
              "@type": "Question",
              "name": "Can I choose custom orientation, page size, and margins?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. You can set page orientation, target page size, fit behavior, and margins before creating the final PDF."
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
          "PDF to JPG Converter Online | Extract PDF Pages as Images | SiRa Convert",
          "Convert PDF pages to JPG or PNG with page-range and quality controls, then export individual files or ZIP."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert PDF to JPG",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser",
          "url": rootUrl + pagePath,
          "description": "Convert PDF pages to JPG or PNG with page-range and quality controls, then export individual files or ZIP.",
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
          "name": "PDF to JPG FAQ",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Can I convert only selected pages from a PDF file?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Enter ranges such as 1-4,7,10-12 to export only specific pages and skip the rest."
              }
            },
            {
              "@type": "Question",
              "name": "When should I choose JPG vs PNG output?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Choose JPG for smaller files and faster sharing. Choose PNG when you need sharper edges and near-lossless quality."
              }
            },
            {
              "@type": "Question",
              "name": "Can I download all converted pages at once?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Export all converted images as a ZIP for one-click download and easier transfer."
              }
            },
            {
              "@type": "Question",
              "name": "Can this tool handle password-protected PDFs?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. If the PDF is locked, you are prompted for the password so conversion can continue securely."
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
          "Merge PDF Files Online | Fast, Secure & Free | SiRa Convert",
          "Merge PDF files online with drag reorder, skip-locked option, and custom output naming."
        );
        graph.push({
          "@type": "SoftwareApplication",
          "name": "SiRa Convert Merge PDF",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser",
          "url": rootUrl + pagePath,
          "description": "Merge PDF files online with drag reorder, skip-locked option, and custom output naming.",
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
          "name": "Merge PDF FAQ",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Does the final merge keep my selected file order?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. The merged PDF follows the exact queue order shown in the uploader before processing."
              }
            },
            {
              "@type": "Question",
              "name": "Can I continue even if one file is locked or invalid?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Enable skip mode to merge all valid PDFs while ignoring protected or unreadable files."
              }
            },
            {
              "@type": "Question",
              "name": "Can I rename the output before download?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Set a custom output filename in controls so your merged document is easier to identify later."
              }
            },
            {
              "@type": "Question",
              "name": "Are there size or page limits for merging?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Each file supports up to 200 MB and each merge run supports up to 300 total pages for stable performance."
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
          "About SiRa Convert | Mission, Product Vision & Trust",
          "Learn about SiRa Convert mission, roadmap, and product principles for fast and private document workflows."
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
          "name": "About SiRa Convert FAQ",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is the core mission of SiRa Convert?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "The mission is to make common PDF and image tasks faster, clearer, and more reliable without heavy software."
              }
            },
            {
              "@type": "Question",
              "name": "Who is this product designed for?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "It is designed for students, professionals, and creators who need accurate document conversion with minimal setup."
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
          "SiRa Convert Blog | PDF Workflow Tips, Updates & Release Notes",
          "Read SiRa Convert release notes, workflow tips, and roadmap updates for online PDF tools."
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
          "name": "SiRa Convert Blog FAQ",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "How often do you publish blog updates?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "New posts are published around meaningful releases, stability improvements, and important roadmap changes."
              }
            },
            {
              "@type": "Question",
              "name": "Does the blog include practical usage tips?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. Posts include practical recommendations to improve output quality and complete conversion or merge tasks faster."
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
          "Read SiRa Convert privacy policy for file handling, browser processing, analytics, and user controls."
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
          "Terms covering usage responsibilities, acceptable behavior, and service limitations for SiRa Convert."
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
