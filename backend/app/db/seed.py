import logging

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.authority import Authority

logger = logging.getLogger(__name__)

AUTHORITIES = [
    # Central — Health
    {"name": "Ministry of Health and Family Welfare", "jurisdiction": "central", "category": "health",
     "description": "Apex body for health policy, national health programs, AIIMS, and central hospitals.",
     "keywords": "health hospital medical aiims doctors nurses medicine expenditure budget allocation nhm"},
    {"name": "Central Drugs Standard Control Organisation (CDSCO)", "jurisdiction": "central", "category": "health",
     "description": "Regulates drugs, cosmetics, medical devices, and clinical trials.",
     "keywords": "drugs medicine approval license pharma clinical trials cosmetics medical devices"},

    # Central — Education
    {"name": "Ministry of Education", "jurisdiction": "central", "category": "education",
     "description": "Oversees school and higher education policy, IITs, NITs, UGC, CBSE.",
     "keywords": "education school college university iit nit cbse ugc scholarship fees students teachers"},
    {"name": "University Grants Commission (UGC)", "jurisdiction": "central", "category": "education",
     "description": "Regulates higher education institutions and disburses grants.",
     "keywords": "ugc university grants college affiliation faculty positions research funds PhD"},

    # Central — Finance
    {"name": "Ministry of Finance", "jurisdiction": "central", "category": "finance",
     "description": "Manages union budget, taxation, banking regulation, and economic policy.",
     "keywords": "finance budget taxes expenditure GST income tax fiscal deficit economy treasury"},
    {"name": "Income Tax Department", "jurisdiction": "central", "category": "finance",
     "description": "Administers direct taxes including income tax and corporate tax.",
     "keywords": "income tax returns refund assessment notice demand TDS PAN tax evasion"},
    {"name": "Reserve Bank of India (RBI)", "jurisdiction": "central", "category": "finance",
     "description": "Central bank — monetary policy, banking regulation, currency issuance.",
     "keywords": "RBI bank interest rates monetary policy banking license regulation currency notes"},
    {"name": "Securities and Exchange Board of India (SEBI)", "jurisdiction": "central", "category": "finance",
     "description": "Regulates securities markets, stock exchanges, and investment funds.",
     "keywords": "SEBI stock market shares mutual funds investment broker regulation IPO"},

    # Central — Infrastructure / Transport
    {"name": "Ministry of Railways (Indian Railways)", "jurisdiction": "central", "category": "infrastructure",
     "description": "Operates and plans Indian Railways network — trains, tracks, stations.",
     "keywords": "railway train station track ticket reservation coach accident budget expenditure"},
    {"name": "Ministry of Road Transport and Highways", "jurisdiction": "central", "category": "infrastructure",
     "description": "Plans and builds national highways; regulates road transport.",
     "keywords": "highway road construction NHAI toll expressway vehicle transport accident bridge"},
    {"name": "National Highways Authority of India (NHAI)", "jurisdiction": "central", "category": "infrastructure",
     "description": "Develops and maintains national highway network.",
     "keywords": "NHAI highway toll national highway construction work order contract maintenance"},
    {"name": "Ministry of Civil Aviation", "jurisdiction": "central", "category": "infrastructure",
     "description": "Oversees airports, airlines, DGCA, and air traffic.",
     "keywords": "airport airline aviation DGCA flight pilot license air traffic safety"},
    {"name": "Ministry of Urban Development / Housing and Urban Affairs", "jurisdiction": "central", "category": "infrastructure",
     "description": "Smart cities, urban housing, PMAY, metro rail policy.",
     "keywords": "smart city urban housing metro PMAY housing scheme slum city development"},

    # Central — Home Affairs / Defence
    {"name": "Ministry of Home Affairs", "jurisdiction": "central", "category": "law_order",
     "description": "Internal security, border management, CBI, IPS, central paramilitary forces.",
     "keywords": "police IPS CRPF BSF home security crime law order border passport visa"},
    {"name": "Ministry of Defence", "jurisdiction": "central", "category": "defence",
     "description": "Defence forces, DRDO, defence procurement and policy.",
     "keywords": "army navy air force defence military procurement DRDO ordnance expenditure budget"},
    {"name": "Central Bureau of Investigation (CBI)", "jurisdiction": "central", "category": "law_order",
     "description": "Central investigative agency for corruption and complex crimes.",
     "keywords": "CBI investigation corruption fraud case FIR charge sheet probe"},

    # Central — Environment
    {"name": "Ministry of Environment, Forest and Climate Change", "jurisdiction": "central", "category": "environment",
     "description": "Environmental clearances, forest conservation, pollution control.",
     "keywords": "environment pollution forest clearance climate change wildlife sanctuary EIA coal"},
    {"name": "Central Pollution Control Board (CPCB)", "jurisdiction": "central", "category": "environment",
     "description": "Monitors air and water pollution; sets standards for industry.",
     "keywords": "pollution air quality water river effluent factory emission standard penalty"},

    # Central — Agriculture
    {"name": "Ministry of Agriculture and Farmers Welfare", "jurisdiction": "central", "category": "agriculture",
     "description": "Agricultural policy, crop insurance, MSP, irrigation schemes.",
     "keywords": "agriculture farmer crop MSP irrigation fertilizer subsidy insurance PM-KISAN scheme"},
    {"name": "Food Corporation of India (FCI)", "jurisdiction": "central", "category": "agriculture",
     "description": "Manages food grain procurement, storage, and distribution (PDS).",
     "keywords": "FCI food grain wheat rice procurement storage ration PDS fair price shop"},

    # Central — Social Welfare
    {"name": "Ministry of Labour and Employment", "jurisdiction": "central", "category": "social_welfare",
     "description": "Labour laws, ESIC, EPFO, minimum wage, industrial relations.",
     "keywords": "labour worker ESIC PF EPF minimum wage employment scheme work"},
    {"name": "Employees Provident Fund Organisation (EPFO)", "jurisdiction": "central", "category": "social_welfare",
     "description": "Manages provident fund, pension, and insurance for employees.",
     "keywords": "EPF PF provident fund pension withdrawal EPFO UAN account employer employee"},
    {"name": "Ministry of Women and Child Development", "jurisdiction": "central", "category": "social_welfare",
     "description": "Anganwadi, ICDS, schemes for women and children welfare.",
     "keywords": "anganwadi women child development ICDS nutrition scheme gender welfare"},
    {"name": "Ministry of Social Justice and Empowerment", "jurisdiction": "central", "category": "social_welfare",
     "description": "Schemes for SC/ST/OBC communities, persons with disabilities, elderly.",
     "keywords": "SC ST OBC scholarship reservation disability elderly welfare scheme caste"},

    # Central — Technology
    {"name": "Ministry of Electronics and Information Technology (MeitY)", "jurisdiction": "central", "category": "technology",
     "description": "Digital India, IT policy, data protection, cybersecurity, Aadhaar.",
     "keywords": "digital india IT technology Aadhaar data policy cybersecurity startup e-governance"},

    # Central — Other
    {"name": "Ministry of External Affairs", "jurisdiction": "central", "category": "other",
     "description": "Foreign policy, passport and visa services, overseas Indian affairs.",
     "keywords": "passport visa foreign embassy consulate OCI NRI country visa travel"},
    {"name": "Ministry of Law and Justice", "jurisdiction": "central", "category": "law_order",
     "description": "Legislative drafting, judicial appointments, law commission.",
     "keywords": "law justice court judge advocate legal aid legislative bill amendment"},
    {"name": "Ministry of Petroleum and Natural Gas", "jurisdiction": "central", "category": "other",
     "description": "Oil and gas policy, upstream/downstream regulation, fuel prices.",
     "keywords": "petroleum gas oil fuel price petrol diesel LPG CNG refinery pipeline"},
    {"name": "Ministry of Power", "jurisdiction": "central", "category": "infrastructure",
     "description": "Electricity generation, distribution, RE policy, power projects.",
     "keywords": "electricity power energy distribution grid solar wind renewable tariff subsidy"},
    {"name": "Ministry of Commerce and Industry", "jurisdiction": "central", "category": "other",
     "description": "Trade policy, export-import, SEZ, FDI, startup regulation.",
     "keywords": "trade export import commerce industry SEZ FDI policy startup MSME"},

    # State — Karnataka examples
    {"name": "Karnataka Department of Health and Family Welfare", "jurisdiction": "state", "category": "health",
     "description": "Karnataka state health department — district hospitals, PHCs, state health schemes.",
     "keywords": "karnataka health hospital district PHC taluk medical expenditure state scheme ayushman"},
    {"name": "Bruhat Bengaluru Mahanagara Palike (BBMP)", "jurisdiction": "state", "category": "infrastructure",
     "description": "Bengaluru civic body — roads, drainage, waste, property tax, building permits.",
     "keywords": "BBMP bengaluru road pothole drain garbage property tax building permit ward"},
    {"name": "Karnataka Department of Education", "jurisdiction": "state", "category": "education",
     "description": "Karnataka school education, SSLC, PUC, teacher recruitment.",
     "keywords": "karnataka school SSLC PUC teacher recruitment education fund scholarship"},
    {"name": "Karnataka State Police", "jurisdiction": "state", "category": "law_order",
     "description": "Karnataka police department — law and order, FIR, investigation.",
     "keywords": "karnataka police FIR crime investigation station SP DCP charge sheet"},
    {"name": "Karnataka Public Works Department (PWD)", "jurisdiction": "state", "category": "infrastructure",
     "description": "Builds and maintains state roads, bridges, and government buildings in Karnataka.",
     "keywords": "karnataka PWD road bridge construction work order expenditure tender state highway"},
]


def seed_authorities():
    db: Session = SessionLocal()
    try:
        if db.query(Authority).count() > 0:
            return  # Already seeded
        for a in AUTHORITIES:
            db.add(Authority(**a, active=True))
        db.commit()
        logger.info("Seeded %d authorities", len(AUTHORITIES))
    except Exception as e:
        db.rollback()
        logger.warning("Seed error: %s", e)
    finally:
        db.close()
