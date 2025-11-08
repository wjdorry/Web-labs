(() => {
    "use strict";
    function isWebp() {
        function testWebP(callback) {
            let webP = new Image;
            webP.onload = webP.onerror = function() {
                callback(webP.height == 2);
            };
            webP.src = "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
        }
        testWebP((function(support) {
            let className = support === true ? "webp" : "no-webp";
            document.documentElement.classList.add(className);
        }));
    }
    let addWindowScrollEvent = false;
    setTimeout((() => {
        if (addWindowScrollEvent) {
            let windowScroll = new Event("windowScroll");
            window.addEventListener("scroll", (function(e) {
                document.dispatchEvent(windowScroll);
            }));
        }
    }), 0);
    window["FLS"] = true;
    isWebp();
})();

// Глобальный каталог товаров/услуг для лендинга (15 объектов, >=6 полей, с фото)
window.catalog = [
{
  id: 1,
  name: "Business Law",
  type: "service",
  price: 14999,
  currency: "RUB",
  image: "img/catalog/Business Law.png",
  rating: 4.8,
  inStock: true,
  description: "Incorporation, contracts, mergers and ongoing corporate counsel"
},
{
  id: 2,
  name: "Construction Law",
  type: "service",
  price: 13999,
  currency: "RUB",
  image: "img/catalog/Construction Law.png",
  rating: 4.6,
  inStock: true,
  description: "Contract drafting, claims, defects and dispute resolution"
},
{
  id: 3,
  name: "Car Accident Claims",
  type: "service",
  price: 7999,
  currency: "RUB",
  image: "img/catalog/Car Accident Claims.png",
  rating: 4.7,
  inStock: true,
  description: "Injury evaluation, insurer negotiations and court representation"
},
{
  id: 4,
  name: "Wrongful Death",
  type: "service",
  price: 29999,
  currency: "RUB",
  image: "img/catalog/Wrongful Death.png",
  rating: 4.9,
  inStock: true,
  description: "Compassionate pursuit of maximum compensation for families"
},
{
  id: 5,
  name: "Criminal Defense",
  type: "service",
  price: 18999,
  currency: "RUB",
  image: "img/catalog/Criminal Defense.png",
  rating: 4.7,
  inStock: true,
  description: "Defense strategy, plea bargaining and trial advocacy"
},
{
  id: 6,
  name: "Family Law",
  type: "service",
  price: 9999,
  currency: "RUB",
  image: "img/catalog/Family Law.png",
  rating: 4.6,
  inStock: true,
  description: "Divorce, child custody, alimony and marital agreements"
},
{
  id: 7,
  name: "Real Estate Law",
  type: "service",
  price: 11999,
  currency: "RUB",
  image: "img/catalog/Real Estate Law.png",
  rating: 4.5,
  inStock: true,
  description: "Transactions, title review, leases and property disputes"
},
{
  id: 8,
  name: "Employment Law",
  type: "service",
  price: 10999,
  currency: "RUB",
  image: "img/catalog/Employment Law.png",
  rating: 4.6,
  inStock: true,
  description: "Workplace policies, wrongful termination and compliance"
},
{
  id: 9,
  name: "Medical Malpractice",
  type: "service",
  price: 15999,
  currency: "RUB",
  image: "img/catalog/Medical Malpractice.png",
  rating: 4.4,
  inStock: true,
  description: "Negligence assessment, expert coordination and litigation"
},
{
  id: 10,
  name: "Insurance Claims",
  type: "service",
  price: 7999,
  currency: "RUB",
  image: "img/catalog/Insurance Claims.png",
  rating: 4.5,
  inStock: true,
  description: "Coverage disputes, bad-faith actions and recovery maximization"
},
{
  id: 11,
  name: "Intellectual Property",
  type: "service",
  price: 12999,
  currency: "RUB",
  image: "img/catalog/Intellectual Property.png",
  rating: 4.6,
  inStock: true,
  description: "Trademarks, copyrights, licensing and enforcement"
},
{
  id: 12,
  name: "Immigration Law",
  type: "service",
  price: 9999,
  currency: "RUB",
  image: "img/catalog/Immigration Law.png",
  rating: 4.5,
  inStock: true,
  description: "Visas, residency, work permits and appeals"
},
{
  id: 13,
  name: "Tax Law Advisory",
  type: "service",
  price: 11999,
  currency: "RUB",
  image: "img/catalog/Tax Law Advisory.png",
  rating: 4.7,
  inStock: true,
  description: "Tax planning, audits and dispute resolution"
},
{
  id: 14,
  name: "Estate Planning",
  type: "service",
  price: 8999,
  currency: "RUB",
  image: "img/catalog/Estate Planning.png",
  rating: 4.6,
  inStock: true,
  description: "Wills, trusts, probate and asset protection"
},
{
  id: 15,
  name: "Contract Drafting & Review",
  type: "service",
  price: 7499,
  currency: "RUB",
  image: "img/catalog/Contract Drafting & Review.png",
  rating: 4.5,
  inStock: true,
  description: "Clear, enforceable agreements tailored to your objectives"
}
];

// Additional diversified services and products to enrich filtering
window.catalog = window.catalog.concat([
  {
    id: 16,
    name: "Bankruptcy Law",
    type: "service",
    price: 12999,
    currency: "RUB",
    image: "img/block7/IMAGE.webp",
    rating: 4.4,
    inStock: true,
    description: "Chapter filings, creditor negotiations and debt restructuring"
  },
  {
    id: 17,
    name: "Cybersecurity & Data Privacy",
    type: "service",
    price: 17999,
    currency: "RUB",
    image: "img/block7/bg.webp",
    rating: 4.6,
    inStock: true,
    description: "Incident response, policies, DPIA and regulatory compliance"
  },
  {
    id: 18,
    name: "Environmental Law",
    type: "service",
    price: 11999,
    currency: "RUB",
    image: "img/block6/IMAGE.svg",
    rating: 4.3,
    inStock: true,
    description: "Permitting, impact assessments and enforcement actions"
  },
  {
    id: 19,
    name: "Patent Prosecution",
    type: "service",
    price: 22999,
    currency: "RUB",
    image: "img/block1/decor.svg",
    rating: 4.8,
    inStock: true,
    description: "Prior art search, drafting and office action responses"
  },
  {
    id: 20,
    name: "Trademark Portfolio",
    type: "service",
    price: 9999,
    currency: "RUB",
    image: "img/footer/IMAGE.svg",
    rating: 4.7,
    inStock: true,
    description: "Clearance, filing, watch and enforcement strategy"
  },
  {
    id: 21,
    name: "Copyright Licensing",
    type: "service",
    price: 7499,
    currency: "RUB",
    image: "img/block2/pen.svg",
    rating: 4.5,
    inStock: true,
    description: "Content rights, royalty models and distribution agreements"
  },
  {
    id: 22,
    name: "Arbitration",
    type: "service",
    price: 18999,
    currency: "RUB",
    image: "img/block4/IMAGE.svg",
    rating: 4.6,
    inStock: true,
    description: "Cross-border disputes, institutional rules and awards"
  },
  {
    id: 23,
    name: "Mediation",
    type: "service",
    price: 8999,
    currency: "RUB",
    image: "img/block5/IMAGE.svg",
    rating: 4.2,
    inStock: true,
    description: "Facilitated settlement conferences with neutral guidance"
  },
  {
    id: 24,
    name: "Securities Compliance",
    type: "service",
    price: 20999,
    currency: "RUB",
    image: "img/block7/deco.svg",
    rating: 4.6,
    inStock: true,
    description: "Disclosure, offerings, insider policies and investigations"
  },
  {
    id: 25,
    name: "Franchise Law",
    type: "service",
    price: 13999,
    currency: "RUB",
    image: "img/block2/img1.webp",
    rating: 4.4,
    inStock: true,
    description: "FDD preparation, franchisor agreements and disputes"
  },
  {
    id: 26,
    name: "Startup General Counsel",
    type: "service",
    price: 9999,
    currency: "RUB",
    image: "img/block2/img2.webp",
    rating: 4.7,
    inStock: true,
    description: "Seed docs, ESOP, NDAs, vendor and client contracts"
  },
  {
    id: 27,
    name: "Nonprofit Formation",
    type: "service",
    price: 6999,
    currency: "RUB",
    image: "img/block1/IMAGE.webp",
    rating: 4.3,
    inStock: true,
    description: "Bylaws, 501(c) filings, governance and grants compliance"
  },
  {
    id: 28,
    name: "Legal Templates Pack",
    type: "product",
    price: 2999,
    currency: "RUB",
    image: "img/block7/90.svg",
    rating: 4.1,
    inStock: true,
    description: "Bundle of contract templates for small businesses"
  },
  {
    id: 29,
    name: "GDPR Toolkit",
    type: "product",
    price: 3999,
    currency: "RUB",
    image: "img/block6/IMAGE.svg",
    rating: 4.5,
    inStock: true,
    description: "Policies, records, notices and DPIA templates"
  },
  {
    id: 30,
    name: "Maritime Law",
    type: "service",
    price: 16999,
    currency: "RUB",
    image: "img/block2/men.webp",
    rating: 4.6,
    inStock: true,
    description: "Cargo claims, collisions, crew injury and charterparties"
  }
]);