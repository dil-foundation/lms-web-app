# Stage 0 - Image URL Reference Guide

Quick reference for all Supabase storage image URLs used in Stage 0 lessons.

---

## Base URL
```
https://otobfhnqafoyqinjenle.supabase.co/storage/v1/object/public/dil-lms-public/stage-0/
```

---

## Lesson 1: Alphabet Images

### Pattern
```
{BASE_URL}/lesson-1/{LETTER}.png
```

### Examples
```
.../lesson-1/A.png
.../lesson-1/B.png
.../lesson-1/C.png
...
.../lesson-1/Z.png
```

### Total Images: 26 (A-Z)

---

## Lesson 2: Phonics Images

### Pattern
```
{BASE_URL}/lesson-2/{FILENAME}.png
```

### Complete List
| Key | Filename | Title |
|-----|----------|-------|
| `b-v` | `B_Vs_V.png` | B as in Ball vs. V as in Van |
| `t-th` | `T_Vs_Th.png` | T as in Time vs. TH as in Think |
| `p-f` | `P_Vs_F.png` | P as in Pen vs. F as in Fan |
| `d-t` | `D_Vs_T.png` | D as in Dog vs. T as in Top |
| `s-z` | `S_Vs_Z.png` | S as in Sun vs. Z as in Zoo |
| `k-g` | `K_Vs_G.png` | K as in King vs. G as in Goat |
| `ch-sh` | `CH_Vs_SH.png` | CH as in Chair vs. SH as in Ship |
| `j-z` | `J_Vs_Z.png` | J as in Jam vs. Z as in Zip |
| `l-r` | `L_Vs_R.png` | L as in Lion vs. R as in Rain |
| `silent` | `K_Vs_B_Vs_L.png` | Silent Letters (K, B, L) |

### Total Images: 10

---

## Lesson 3: Vocabulary Images

### Pattern
```
{BASE_URL}/lesson-3/{FOLDER}/{FILENAME}.png
```

### Numbers Folder (`numbers/`)
```
.../lesson-3/numbers/1.png
.../lesson-3/numbers/2.png
.../lesson-3/numbers/3.png
.../lesson-3/numbers/4.png
.../lesson-3/numbers/5.png
.../lesson-3/numbers/6.png
.../lesson-3/numbers/7.png
.../lesson-3/numbers/8.png
.../lesson-3/numbers/9.png
.../lesson-3/numbers/10.png
```
**Total: 10 images**

### Days of Week Folder (`week/`)
```
.../lesson-3/week/Monday.png
.../lesson-3/week/Tuesday.png
.../lesson-3/week/Wednesday.png
.../lesson-3/week/Thursday.png
.../lesson-3/week/Friday.png
.../lesson-3/week/Saturday.png
.../lesson-3/week/Sunday.png
```
**Total: 7 images**

### Colors Folder (`colors/`)
```
.../lesson-3/colors/Red.png
.../lesson-3/colors/Blue.png
.../lesson-3/colors/Green.png
.../lesson-3/colors/Yellow.png
.../lesson-3/colors/Black.png
.../lesson-3/colors/White.png
```
**Total: 6 images**

### Classroom Items Folder (`class-room-items/`)
```
.../lesson-3/class-room-items/Book.png
.../lesson-3/class-room-items/Pen.png
.../lesson-3/class-room-items/Chair.png
.../lesson-3/class-room-items/Table.png
.../lesson-3/class-room-items/Bag.png
```
**Total: 5 images**

**Lesson 3 Total: 28 images**

---

## Lesson 4: Sight Words Images

### Pattern
```
{BASE_URL}/lesson-4/{FOLDER}/{FILENAME}.png
```

### Common Sight Words Folder (`common-sight-words/`)
```
.../lesson-4/common-sight-words/I.png
.../lesson-4/common-sight-words/You.png
.../lesson-4/common-sight-words/He.png
.../lesson-4/common-sight-words/She.png
.../lesson-4/common-sight-words/It.png
.../lesson-4/common-sight-words/We.png
```
**Total: 6 images**

### Greetings Folder (`greetings/`)
```
.../lesson-4/greetings/Hello.png
.../lesson-4/greetings/How%20are%20you.png
.../lesson-4/greetings/My%20name%20is%20ali.png
```
**Note**: Special case - "Ali" is lowercase in filename
**Total: 3 images**

### Useful Words Folder (`useful-words/`)
```
.../lesson-4/useful-words/How%20are%20you.png
.../lesson-4/useful-words/I%27m%20doing%20well.png
.../lesson-4/useful-words/What%27s%20your%20name.png
.../lesson-4/useful-words/My%20name%20is%20alyah.png
.../lesson-4/useful-words/Nice%20to%20meet%20you.png
```
**Notes**: 
- Apostrophes → `%27`
- "Aaliyah" → "alyah" in filename
**Total: 5 images**

### UI Words Folder (`ui-words/`)
```
.../lesson-4/ui-words/Inbox.png
.../lesson-4/ui-words/Settings.png
.../lesson-4/ui-words/Notifications.png
.../lesson-4/ui-words/Options.png
.../lesson-4/ui-words/Select.png
```
**Total: 5 images**

**Lesson 4 Total: 19 images**

---

## URL Encoding Rules

### Lesson 4 Filename Conversion

#### Standard Rules
1. Remove punctuation: `.`, `?`, `!`, `,`
2. Replace spaces with `%20`
3. Replace apostrophes with `%27`

#### Examples
| Original Text | Filename |
|--------------|----------|
| `Hello` | `Hello.png` |
| `How are you?` | `How%20are%20you.png` |
| `I'm doing well.` | `I%27m%20doing%20well.png` |
| `What's your name?` | `What%27s%20your%20name.png` |
| `Nice to meet you.` | `Nice%20to%20meet%20you.png` |

#### Special Overrides
| Page | Original | Actual Filename |
|------|----------|-----------------|
| greetings | `My name is Ali` | `My%20name%20is%20ali` (lowercase "ali") |
| useful-words | `My name is Aaliyah.` | `My%20name%20is%20alyah` ("alyah" spelling) |

---

## Total Image Count

| Lesson | Topic | Count |
|--------|-------|-------|
| 1 | Alphabet | 26 |
| 2 | Phonics | 10 |
| 3 | Vocabulary | 28 |
| 4 | Sight Words | 19 |
| **TOTAL** | **Stage 0** | **83 images** |

---

## Image Dimensions & Format

### Recommended Specifications
- **Format**: PNG (with transparency support)
- **Dimensions**: Variable (responsive images)
- **Aspect Ratio**: Typically 4:3 or 16:9
- **File Size**: Optimized for web (< 200KB recommended)
- **Color Space**: sRGB

### Display Sizes in Web App
- **Mobile**: 48rem height (h-48) ≈ 192px
- **Desktop**: 56rem height (h-56) ≈ 224px
- **Phonics**: 64rem height (h-64) ≈ 256px (mobile), 80rem (h-80) ≈ 320px (desktop)

---

## Testing Image URLs

### Quick Test Script (Browser Console)
```javascript
// Test Lesson 1
const testLesson1 = (letter) => {
  const url = `https://otobfhnqafoyqinjenle.supabase.co/storage/v1/object/public/dil-lms-public/stage-0/lesson-1/${letter}.png`;
  fetch(url).then(r => console.log(`${letter}: ${r.ok ? '✓' : '✗'}`));
};
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(testLesson1);

// Test Lesson 2
const testLesson2 = (key) => {
  const files = {
    'b-v': 'B_Vs_V.png',
    'ch-sh': 'CH_Vs_SH.png',
    // ... add others
  };
  const url = `https://otobfhnqafoyqinjenle.supabase.co/storage/v1/object/public/dil-lms-public/stage-0/lesson-2/${files[key]}`;
  fetch(url).then(r => console.log(`${key}: ${r.ok ? '✓' : '✗'}`));
};
```

---

## Common Issues & Solutions

### Issue 1: Image Not Loading
**Cause**: Incorrect filename casing or encoding
**Solution**: Check exact filename in Supabase storage, verify URL encoding

### Issue 2: 404 Error
**Cause**: File doesn't exist in storage
**Solution**: Upload missing file to correct folder

### Issue 3: CORS Error
**Cause**: Storage bucket not public
**Solution**: Ensure bucket has public read access

### Issue 4: Broken Image Display
**Cause**: Invalid image file
**Solution**: Re-upload valid PNG file

---

## Maintenance Checklist

When adding new images:
- [ ] Upload to correct folder
- [ ] Use correct naming convention
- [ ] Test URL in browser
- [ ] Update filename mapping (if needed)
- [ ] Optimize file size
- [ ] Verify transparency (if needed)
- [ ] Test in web app
- [ ] Update this documentation

---

## Contact & Support

For image-related issues:
1. Check Supabase storage console
2. Verify bucket permissions
3. Test URL directly in browser
4. Check browser console for errors
5. Verify filename encoding in code
