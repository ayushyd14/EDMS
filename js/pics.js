// ============================================================
//  PROFILE PICTURES: edit these two lists, nothing else.
//  Key = Emp Code OR full name (not case sensitive) / group name.
//  Investors are matched by their name.
//  Value = image path, relative to the html/ pages ("../images/...").
//  Anyone not listed, or with a wrong path, keeps the grey placeholder.
// ============================================================
const PROFILE_PICS = {
    "190021": "../images/190021.jpg",   // Brad Q.
    "210219": "../images/210219.jpg",   // V.C. Chandrapaul
    "07032": "https://thumbs.dreamstime.com/b/asian-business-man-profile-icon-chinese-japanese-businessman-avatar-isolated-flat-vector-illustration-asian-business-man-108213215.jpg",   // Chris Harrison
    "020002": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/d95c1f148207527.62d1246c25004.jpg",   // Zuvloć Romilly
    "150028": "https://static.vecteezy.com/system/resources/previews/055/281/758/non_2x/male-avatar-illustration-for-profile-or-projects-vector.jpg",   // Leo Cooper
    "98004": "https://thumbs.dreamstime.com/b/asian-businessman-profile-icon-isolated-male-chinese-japanese-business-man-avatar-flat-vector-illustration-108617465.jpg",   // Vishy Sharma
    "970001": "https://static.vecteezy.com/system/resources/previews/036/190/422/non_2x/old-business-man-blank-profile-photo-vector.jpg",   // Edwin Foster
    "030009": "https://img.magnific.com/premium-vector/portrait-asian-person-casual-clothes-happy-young-man-avatar-male-face-head-chinese-korean-japanese-nationality-user-profile-flat-isolated-vector-illustration-white-background_633472-5682.jpg?semt=ais_hybrid&w=740&q=80",   // Shikaku Nakuru
    "Warren Buffett (Berkshire Hathaway)": "https://www.givingpledge.org/wp-content/uploads/2025/03/Buffett_500x500.jpg",   // Shikaku Nakuru
    "Mohammad bin Salman Al-Saud": "https://cdn.i-scmp.com/sites/default/files/styles/768x768/public/d8/images/methode/2019/12/13/6b06cb22-1ca7-11ea-8971-922fdc94075f_image_hires_132744.jpg?itok=XditGQBc&v=1576214873",   // Shikaku Nakuru
    "Daniel Sundheim": "https://imageio.forbes.com/specials-images/imageserve/6063814730d15bbcd7ce7e1c/0x0.jpg?format=jpg&crop=1361,1362,x0,y435,safe&height=416&width=416&fit=bounds",   // Shikaku Nakuru
    "Bill Ackman (Pershing Square)": "https://pershingsquaresparcholdings.com/wp-content/uploads/2020/06/Bill-Ackman-Photo-2026.jpg",   // Shikaku Nakuru
    "21012": "https://thumbs.dreamstime.com/b/brown-hair-businesswoman-avatar-woman-face-profile-icon-concept-online-support-service-female-cartoon-character-portrait-brown-126956822.jpg",   // Shikaku Nakuru
};

const GROUP_PICS = {
    "All Employees": "../images/all-employees.png",
    "India-Japan Branch": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQd9CSO0LSrU2PxkW9IKsxRA8q1Z_q-MNlA-WtZunbdxw&s=10",
    "German-French Branch": "https://thumbs.dreamstime.com/b/france-germany-circle-flags-d-icon-round-german-french-national-symbols-vector-304673402.jpg",
    // "German-French Branch": "../images/german-french.png",
};