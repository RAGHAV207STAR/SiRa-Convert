(function () {
  "use strict";

  var byPath = {
    "/": {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "name": "SiRa Convert",
          "url": "https://sira-452b7.web.app/",
          "inLanguage": "en-US"
        },
        {
          "@type": "Organization",
          "name": "SiRa Convert",
          "url": "https://sira-452b7.web.app/",
          "logo": "https://sira-452b7.web.app/logo.png"
        },
        {
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
          "url": "https://sira-452b7.web.app/"
        }
      ]
    },
    "/index.html": {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "name": "SiRa Convert",
          "url": "https://sira-452b7.web.app/",
          "inLanguage": "en-US"
        },
        {
          "@type": "Organization",
          "name": "SiRa Convert",
          "url": "https://sira-452b7.web.app/",
          "logo": "https://sira-452b7.web.app/logo.png"
        },
        {
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
          "url": "https://sira-452b7.web.app/"
        }
      ]
    },
    "/jpg-to-pdf.html": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "SiRa Convert JPG to PDF",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "url": "https://sira-452b7.web.app/jpg-to-pdf.html",
      "description": "Convert JPG, PNG, and WEBP images to high-quality PDF in-browser with advanced quality controls.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    },
    "/pdf-to-jpg.html": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "SiRa Convert PDF to JPG",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "url": "https://sira-452b7.web.app/pdf-to-jpg.html",
      "description": "Convert PDF pages to JPG or PNG in-browser with high quality output, ZIP export, and private processing.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    },
    "/merge-pdf.html": {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "SiRa Convert Merge PDF",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "url": "https://sira-452b7.web.app/merge-pdf.html",
      "description": "Merge multiple PDF files into one high-quality output in your browser with private processing.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    },
    "/about.html": {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About SiRa Convert",
      "url": "https://sira-452b7.web.app/about.html",
      "description": "About SiRa Convert, a browser-based document conversion toolkit.",
      "mainEntity": {
        "@type": "Person",
        "name": "Raghav Pratap"
      }
    },
    "/blog.html": {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "SiRa Convert Blog",
      "url": "https://sira-452b7.web.app/blog.html",
      "description": "Updates and product notes from SiRa Convert.",
      "author": {
        "@type": "Person",
        "name": "Raghav Pratap"
      }
    },
    "/privacy.html": {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Privacy Policy - SiRa Convert",
      "url": "https://sira-452b7.web.app/privacy.html",
      "description": "Privacy policy and data handling practices for SiRa Convert.",
      "publisher": {
        "@type": "Person",
        "name": "Raghav Pratap"
      }
    },
    "/terms.html": {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Terms of Use - SiRa Convert",
      "url": "https://sira-452b7.web.app/terms.html",
      "description": "Terms of use for SiRa Convert and related services.",
      "publisher": {
        "@type": "Person",
        "name": "Raghav Pratap"
      }
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
