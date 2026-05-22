"""
Convert raw CFF font files extracted from a PDF into WOFF2 web fonts.
Usage: python scripts/convert-cff-to-woff2.py
Outputs WOFF2 files alongside each .cff file in docs/fonts/.
"""

import io
import os
import struct
import sys
from pathlib import Path

from fontTools.ttLib import TTFont, newTable
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib.tables._h_e_a_d import table__h_e_a_d
from fontTools.ttLib.tables._h_h_e_a import table__h_h_e_a
from fontTools.ttLib.tables._m_a_x_p import table__m_a_x_p
from fontTools.ttLib.tables._p_o_s_t import table__p_o_s_t
from fontTools.ttLib.tables.O_S_2f_2 import table_O_S_2f_2, Panose
from fontTools.ttLib.tables._n_a_m_e import table__n_a_m_e, NameRecord
from fontTools.ttLib.tables._c_m_a_p import table__c_m_a_p, cmap_format_4
from fontTools.ttLib.tables._h_m_t_x import table__h_m_t_x

FONTS_DIR = Path("docs/fonts")

# Unicode codepoint lookup for standard glyph names
# (covers the glyphs typically found in these fonts)
GLYPH_TO_UNICODE = {
    ".notdef": None,
    "space": 0x0020,
    "exclam": 0x0021,
    "quotedbl": 0x0022,
    "numbersign": 0x0023,
    "dollar": 0x0024,
    "percent": 0x0025,
    "ampersand": 0x0026,
    "quotesingle": 0x0027,
    "quoteright": 0x2019,
    "parenleft": 0x0028,
    "parenright": 0x0029,
    "asterisk": 0x002A,
    "plus": 0x002B,
    "comma": 0x002C,
    "hyphen": 0x002D,
    "period": 0x002E,
    "slash": 0x002F,
    "zero": 0x0030,
    "one": 0x0031,
    "two": 0x0032,
    "three": 0x0033,
    "four": 0x0034,
    "five": 0x0035,
    "six": 0x0036,
    "seven": 0x0037,
    "eight": 0x0038,
    "nine": 0x0039,
    "colon": 0x003A,
    "semicolon": 0x003B,
    "less": 0x003C,
    "equal": 0x003D,
    "greater": 0x003E,
    "question": 0x003F,
    "at": 0x0040,
    "A": 0x0041, "B": 0x0042, "C": 0x0043, "D": 0x0044, "E": 0x0045,
    "F": 0x0046, "G": 0x0047, "H": 0x0048, "I": 0x0049, "J": 0x004A,
    "K": 0x004B, "L": 0x004C, "M": 0x004D, "N": 0x004E, "O": 0x004F,
    "P": 0x0050, "Q": 0x0051, "R": 0x0052, "S": 0x0053, "T": 0x0054,
    "U": 0x0055, "V": 0x0056, "W": 0x0057, "X": 0x0058, "Y": 0x0059,
    "Z": 0x005A,
    "bracketleft": 0x005B,
    "backslash": 0x005C,
    "bracketright": 0x005D,
    "asciicircum": 0x005E,
    "underscore": 0x005F,
    "grave": 0x0060,
    "a": 0x0061, "b": 0x0062, "c": 0x0063, "d": 0x0064, "e": 0x0065,
    "f": 0x0066, "g": 0x0067, "h": 0x0068, "i": 0x0069, "j": 0x006A,
    "k": 0x006B, "l": 0x006C, "m": 0x006D, "n": 0x006E, "o": 0x006F,
    "p": 0x0070, "q": 0x0071, "r": 0x0072, "s": 0x0073, "t": 0x0074,
    "u": 0x0075, "v": 0x0076, "w": 0x0077, "x": 0x0078, "y": 0x0079,
    "z": 0x007A,
    "braceleft": 0x007B,
    "bar": 0x007C,
    "braceright": 0x007D,
    "asciitilde": 0x007E,
    "endash": 0x2013,
    "emdash": 0x2014,
    "quotedblleft": 0x201C,
    "quotedblright": 0x201D,
    "quoteleft": 0x2018,
    "ellipsis": 0x2026,
    "bullet": 0x2022,
    "fi": 0xFB01,
    "fl": 0xFB02,
    "ae": 0x00E6, "AE": 0x00C6,
    "oe": 0x0153, "OE": 0x0152,
    "Agrave": 0x00C0, "Aacute": 0x00C1, "Acircumflex": 0x00C2,
    "Atilde": 0x00C3, "Adieresis": 0x00C4, "Aring": 0x00C5,
    "Ccedilla": 0x00C7,
    "Egrave": 0x00C8, "Eacute": 0x00C9, "Ecircumflex": 0x00CA,
    "Edieresis": 0x00CB,
    "Igrave": 0x00CC, "Iacute": 0x00CD, "Icircumflex": 0x00CE,
    "Idieresis": 0x00CF,
    "Ntilde": 0x00D1,
    "Ograve": 0x00D2, "Oacute": 0x00D3, "Ocircumflex": 0x00D4,
    "Otilde": 0x00D5, "Odieresis": 0x00D6, "Oslash": 0x00D8,
    "Ugrave": 0x00D9, "Uacute": 0x00DA, "Ucircumflex": 0x00DB,
    "Udieresis": 0x00DC,
    "Yacute": 0x00DD,
    "agrave": 0x00E0, "aacute": 0x00E1, "acircumflex": 0x00E2,
    "atilde": 0x00E3, "adieresis": 0x00E4, "aring": 0x00E5,
    "ccedilla": 0x00E7,
    "egrave": 0x00E8, "eacute": 0x00E9, "ecircumflex": 0x00EA,
    "edieresis": 0x00EB,
    "igrave": 0x00EC, "iacute": 0x00ED, "icircumflex": 0x00EE,
    "idieresis": 0x00EF,
    "ntilde": 0x00F1,
    "ograve": 0x00F2, "oacute": 0x00F3, "ocircumflex": 0x00F4,
    "otilde": 0x00F5, "odieresis": 0x00F6, "oslash": 0x00F8,
    "ugrave": 0x00F9, "uacute": 0x00FA, "ucircumflex": 0x00FB,
    "udieresis": 0x00FC,
    "yacute": 0x00FD, "ydieresis": 0x00FF,
    "germandbls": 0x00DF,
    "registered": 0x00AE,
    "copyright": 0x00A9,
    "trademark": 0x2122,
    "degree": 0x00B0,
    "multiply": 0x00D7,
    "divide": 0x00F7,
    "sterling": 0x00A3,
    "Euro": 0x20AC,
    "yen": 0x00A5,
    "cent": 0x00A2,
    "section": 0x00A7,
    "paragraph": 0x00B6,
    "dagger": 0x2020,
    "daggerdbl": 0x2021,
    "guillemotleft": 0x00AB,
    "guillemotright": 0x00BB,
    "guilsinglleft": 0x2039,
    "guilsinglright": 0x203A,
}


def make_name_record(string, nameID, platformID=3, platEncID=1, langID=0x0409):
    rec = NameRecord()
    rec.nameID = nameID
    rec.platformID = platformID
    rec.platEncID = platEncID
    rec.langID = langID
    rec.string = string.encode("utf-16-be")
    return rec


def convert_cff(cff_path: Path):
    data = cff_path.read_bytes()

    # Decompile raw CFF
    cff_table = newTable("CFF ")
    cff_table.decompile(data, None)
    cff = cff_table.cff
    top = cff.topDictIndex[0]
    cs = top.CharStrings
    glyph_order = [".notdef"] + [g for g in cs.keys() if g != ".notdef"]

    # Extract metrics
    upm = 1000
    if hasattr(top, "FontMatrix"):
        fm = top.FontMatrix
        if fm and fm[0] != 0:
            upm = round(1 / fm[0])

    widths = {}
    lsbs = {}
    all_xmin, all_ymin, all_xmax, all_ymax = 0, 0, 0, 0
    first_bounds = True

    for name in glyph_order:
        charstr = cs[name]
        pen = BoundsPen(cs)
        try:
            charstr.draw(pen)
        except Exception:
            pass
        w = getattr(charstr, "width", upm)
        widths[name] = w
        bounds = pen.bounds
        if bounds:
            xmin, ymin, xmax, ymax = bounds
            lsbs[name] = int(xmin)
            if first_bounds:
                all_xmin, all_ymin, all_xmax, all_ymax = int(xmin), int(ymin), int(xmax), int(ymax)
                first_bounds = False
            else:
                all_xmin = min(all_xmin, int(xmin))
                all_ymin = min(all_ymin, int(ymin))
                all_xmax = max(all_xmax, int(xmax))
                all_ymax = max(all_ymax, int(ymax))
        else:
            lsbs[name] = 0

    # Determine font family name from PS name
    ps_name = cff.fontNames[0] if cff.fontNames else cff_path.stem
    # Strip subset prefix (e.g. "FMVCLN+GoodOT" → "GoodOT")
    family_name = ps_name.split("+")[-1] if "+" in ps_name else ps_name

    font = TTFont(sfntVersion="OTTO")
    font.setGlyphOrder(glyph_order)

    # CFF table
    font["CFF "] = cff_table

    # head
    head = newTable("head")
    head.magicNumber = 0x5F0F3CF5
    head.flags = 0x000B
    head.unitsPerEm = upm
    head.created = 0
    head.modified = 0
    head.xMin = all_xmin
    head.yMin = all_ymin
    head.xMax = all_xmax
    head.yMax = all_ymax
    head.macStyle = 0
    head.lowestRecPPEM = 8
    head.fontDirectionHint = 2
    head.indexToLocFormat = 0
    head.glyphDataFormat = 0
    head.tableVersion = 1.0
    head.fontRevision = 1.0
    head.checkSumAdjustment = 0
    font["head"] = head

    # hhea
    hhea = newTable("hhea")
    hhea.tableVersion = 0x00010000
    ascender = int(top.FontBBox[3]) if hasattr(top, "FontBBox") and top.FontBBox else all_ymax
    descender = int(top.FontBBox[1]) if hasattr(top, "FontBBox") and top.FontBBox else all_ymin
    hhea.ascent = ascender
    hhea.descent = descender
    hhea.lineGap = 0
    hhea.advanceWidthMax = max(widths.values()) if widths else upm
    hhea.minLeftSideBearing = min(lsbs.values()) if lsbs else 0
    hhea.minRightSideBearing = 0
    hhea.xMaxExtent = all_xmax
    hhea.caretSlopeRise = 1
    hhea.caretSlopeRun = 0
    hhea.caretOffset = 0
    hhea.reserved0 = hhea.reserved1 = hhea.reserved2 = hhea.reserved3 = 0
    hhea.metricDataFormat = 0
    hhea.numberOfHMetrics = len(glyph_order)
    font["hhea"] = hhea

    # maxp (version 0.5 for CFF)
    maxp = newTable("maxp")
    maxp.tableVersion = 0x00005000
    maxp.numGlyphs = len(glyph_order)
    font["maxp"] = maxp

    # hmtx
    hmtx = newTable("hmtx")
    hmtx.metrics = {}
    for name in glyph_order:
        hmtx.metrics[name] = (widths.get(name, upm), lsbs.get(name, 0))
    font["hmtx"] = hmtx

    # OS/2
    os2 = newTable("OS/2")
    os2.version = 4
    os2.xAvgCharWidth = int(sum(widths.values()) / len(widths)) if widths else upm // 2
    os2.usWeightClass = 400
    os2.usWidthClass = 5
    os2.fsType = 0
    os2.ySubscriptXSize = upm // 5
    os2.ySubscriptYSize = upm // 5
    os2.ySubscriptXOffset = 0
    os2.ySubscriptYOffset = upm // 5
    os2.ySuperscriptXSize = upm // 5
    os2.ySuperscriptYSize = upm // 5
    os2.ySuperscriptXOffset = 0
    os2.ySuperscriptYOffset = upm // 3
    os2.yStrikeoutSize = upm // 20
    os2.yStrikeoutPosition = upm // 4
    os2.sFamilyClass = 0
    os2.panose = Panose()
    os2.ulUnicodeRange1 = 0x00000003
    os2.ulUnicodeRange2 = os2.ulUnicodeRange3 = os2.ulUnicodeRange4 = 0
    os2.achVendID = "    "
    os2.fsSelection = 0x0040
    os2.fsFirstCharIndex = 0x0020
    os2.fsLastCharIndex = 0x00FF
    os2.sTypoAscender = ascender
    os2.sTypoDescender = descender
    os2.sTypoLineGap = 0
    os2.usWinAscent = max(ascender, all_ymax)
    os2.usWinDescent = abs(min(descender, all_ymin))
    os2.ulCodePageRange1 = 0x00000001
    os2.ulCodePageRange2 = 0
    os2.sxHeight = int(upm * 0.5)
    os2.sCapHeight = int(upm * 0.7)
    os2.usDefaultChar = 0
    os2.usBreakChar = 0x0020
    os2.usMaxContext = 0
    font["OS/2"] = os2

    # name
    name_table = newTable("name")
    name_table.names = []
    records = [
        (1, family_name),
        (2, "Regular"),
        (3, f"1.000;{family_name}"),
        (4, family_name),
        (5, "Version 1.000"),
        (6, ps_name),
    ]
    for nameID, value in records:
        name_table.names.append(make_name_record(value, nameID))
        # also add Mac name records (platformID=1, platEncID=0, langID=0)
        rec = NameRecord()
        rec.nameID = nameID
        rec.platformID = 1
        rec.platEncID = 0
        rec.langID = 0
        rec.string = value.encode("mac-roman", errors="replace")
        name_table.names.append(rec)
    font["name"] = name_table

    # cmap
    cmap_table = newTable("cmap")
    cmap_table.tableVersion = 0
    fmt4 = cmap_format_4(4)
    fmt4.platEncID = 1
    fmt4.platformID = 3
    fmt4.language = 0
    cmap_map = {}
    for glyph_name in glyph_order:
        cp = GLYPH_TO_UNICODE.get(glyph_name)
        if cp is not None:
            cmap_map[cp] = glyph_name
    fmt4.cmap = cmap_map
    cmap_table.tables = [fmt4]
    font["cmap"] = cmap_table

    # post
    post = newTable("post")
    post.formatType = 2.0
    post.italicAngle = 0
    post.underlinePosition = -100
    post.underlineThickness = 50
    post.isFixedPitch = 0
    post.minMemType42 = post.maxMemType42 = 0
    post.minMemType1 = post.maxMemType1 = 0
    post.mapping = {name: name for name in glyph_order}
    post.extraNames = []
    font["post"] = post

    # Write as WOFF2
    out_path = cff_path.with_suffix(".woff2")
    font.flavor = "woff2"
    font.save(str(out_path))
    size_kb = out_path.stat().st_size // 1024
    print(f"  OK {out_path.name} ({len(glyph_order)} glyphs, {size_kb}KB)")
    return out_path


def main():
    cff_files = sorted(FONTS_DIR.glob("*.cff"))
    if not cff_files:
        print("No .cff files found in docs/fonts/")
        sys.exit(1)

    print(f"Converting {len(cff_files)} CFF fonts to WOFF2\n")
    errors = []
    for cff_path in cff_files:
        try:
            convert_cff(cff_path)
        except Exception as e:
            print(f"  FAIL {cff_path.name}: {e}")
            errors.append(cff_path.name)

    print(f"\nDone. {len(cff_files) - len(errors)} converted, {len(errors)} failed.")
    if errors:
        print("Failed:", ", ".join(errors))


if __name__ == "__main__":
    main()
