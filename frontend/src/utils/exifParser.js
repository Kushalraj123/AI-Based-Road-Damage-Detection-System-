// Pure client-side binary EXIF parser for JPEG files
export function parseImageExif(arrayBuffer) {
  const result = {
    hasGps: false,
    latitude: null,
    longitude: null,
    altitude: null,
    dateTime: null,
    cameraMake: null,
    cameraModel: null
  };

  try {
    const view = new DataView(arrayBuffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
      return result; // Not a JPEG
    }

    let offset = 2;
    let app1Found = false;
    let exifOffset = 0;

    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      offset += 2;

      if (marker === 0xFFE1) {
        app1Found = true;
        const length = view.getUint16(offset);
        exifOffset = offset + 2;
        break;
      } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFF00) {
        const length = view.getUint16(offset);
        offset += length;
      } else {
        break;
      }
    }

    if (!app1Found) return result;

    // Check "Exif\0\0"
    const exifHeader = String.fromCharCode(
      view.getUint8(exifOffset),
      view.getUint8(exifOffset + 1),
      view.getUint8(exifOffset + 2),
      view.getUint8(exifOffset + 3)
    );
    if (exifHeader !== 'Exif') return result;

    const tiffOffset = exifOffset + 6;
    const isLittleEndian = view.getUint16(tiffOffset) === 0x4949; // 'II'

    const getU16 = (o) => view.getUint16(tiffOffset + o, isLittleEndian);
    const getU32 = (o) => view.getUint32(tiffOffset + o, isLittleEndian);

    const firstIFDOffset = getU32(4);
    if (firstIFDOffset < 8) return result;

    let gpsIFDOffset = null;
    const ifd0Entries = getU16(firstIFDOffset);
    let curOffset = firstIFDOffset + 2;

    for (let i = 0; i < ifd0Entries; i++) {
      const tag = getU16(curOffset);
      const type = getU16(curOffset + 2);
      const count = getU32(curOffset + 4);
      const valOffset = curOffset + 8;

      if (tag === 0x8825) { // GPSInfo pointer
        gpsIFDOffset = getU32(valOffset);
      } else if (tag === 0x010F) { // Make
        const strOffset = count > 4 ? getU32(valOffset) : valOffset;
        let str = '';
        for (let s = 0; s < count - 1; s++) str += String.fromCharCode(view.getUint8(tiffOffset + strOffset + s));
        result.cameraMake = str.trim();
      } else if (tag === 0x0110) { // Model
        const strOffset = count > 4 ? getU32(valOffset) : valOffset;
        let str = '';
        for (let s = 0; s < count - 1; s++) str += String.fromCharCode(view.getUint8(tiffOffset + strOffset + s));
        result.cameraModel = str.trim();
      } else if (tag === 0x0132 || tag === 0x9003) { // DateTime or DateTimeOriginal
        const strOffset = count > 4 ? getU32(valOffset) : valOffset;
        let str = '';
        for (let s = 0; s < count - 1; s++) str += String.fromCharCode(view.getUint8(tiffOffset + strOffset + s));
        result.dateTime = str.trim();
      }
      curOffset += 12;
    }

    if (gpsIFDOffset !== null) {
      const gpsEntries = getU16(gpsIFDOffset);
      let gpsCur = gpsIFDOffset + 2;
      let latRef = 'N', lngRef = 'E';
      let latParts = null, lngParts = null;
      let altVal = null;

      const getRational = (o) => {
        const num = getU32(o);
        const den = getU32(o + 4) || 1;
        return num / den;
      };

      for (let i = 0; i < gpsEntries; i++) {
        const tag = getU16(gpsCur);
        const valOffset = gpsCur + 8;

        if (tag === 0x0001) { // GPSLatitudeRef
          latRef = String.fromCharCode(view.getUint8(tiffOffset + valOffset));
        } else if (tag === 0x0002) { // GPSLatitude
          const rOffset = getU32(valOffset);
          latParts = [getRational(rOffset), getRational(rOffset + 8), getRational(rOffset + 16)];
        } else if (tag === 0x0003) { // GPSLongitudeRef
          lngRef = String.fromCharCode(view.getUint8(tiffOffset + valOffset));
        } else if (tag === 0x0004) { // GPSLongitude
          const rOffset = getU32(valOffset);
          lngParts = [getRational(rOffset), getRational(rOffset + 8), getRational(rOffset + 16)];
        } else if (tag === 0x0006) { // GPSAltitude
          const rOffset = getU32(valOffset);
          altVal = getRational(rOffset);
        }
        gpsCur += 12;
      }

      if (latParts && lngParts) {
        let lat = latParts[0] + (latParts[1] / 60.0) + (latParts[2] / 3600.0);
        let lng = lngParts[0] + (lngParts[1] / 60.0) + (lngParts[2] / 3600.0);
        if (latRef.toUpperCase() === 'S') lat = -lat;
        if (lngRef.toUpperCase() === 'W') lng = -lng;

        result.hasGps = true;
        result.latitude = parseFloat(lat.toFixed(6));
        result.longitude = parseFloat(lng.toFixed(6));
        result.altitude = altVal ? parseFloat(altVal.toFixed(1)) : null;
      }
    }
  } catch (err) {
    console.warn('Client EXIF parser error:', err);
  }

  return result;
}
