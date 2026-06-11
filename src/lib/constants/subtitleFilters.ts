export interface LanguageOption {
  label: string;
  subdlCode: string;
  subsourceCode: string;
  aliases: string[];
}

export interface ReleaseTypeOption {
  label: string;
  key: string;
  keywords: string[];
}

export interface SubtitleTypeOption {
  label: string;
  key: 'all' | 'standard' | 'hi';
}

export const RELEASE_TYPES: ReleaseTypeOption[] = [
  { label: 'All Release Types', key: 'all', keywords: [] },
  { label: 'WEB', key: 'web', keywords: ['web', 'webrip', 'web-dl', 'webr'] },
  { label: 'BLURAY', key: 'bluray', keywords: ['bluray', 'brrip', 'bdrip', 'blu-ray', 'bd-rip'] },
  { label: 'HDTV', key: 'hdtv', keywords: ['hdtv', 'hd-tv', 'dsrip'] },
  { label: 'CAM/HDTS/HDRIP', key: 'cam', keywords: ['cam', 'hdts', 'hd-ts', 'hdrip', 'ts', 'telesync', 'screener', 'scr'] },
  { label: 'UNOFFICIAL/LEAKED', key: 'unofficial', keywords: ['unofficial', 'leaked', 'workprint', 'wp'] },
  { label: 'DVDRip', key: 'dvdrip', keywords: ['dvdrip', 'dvd-rip', 'r5'] },
  { label: 'Trailer', key: 'trailer', keywords: ['trailer', 'promo'] },
  { label: 'Other', key: 'other', keywords: [] } // Fallback
];

export const SUBTITLE_TYPES: SubtitleTypeOption[] = [
  { label: 'All Subtitles', key: 'all' },
  { label: 'Standard Only', key: 'standard' },
  { label: 'Hearing Impaired (SDH)', key: 'hi' }
];

// Mapped full language list, keeping popular languages at the top
export const SUBTITLE_LANGUAGES: LanguageOption[] = [
  { label: 'English', subdlCode: 'EN', subsourceCode: 'en', aliases: ['english', 'en', 'eng'] },
  { label: 'Farsi/Persian', subdlCode: 'FA', subsourceCode: 'fa', aliases: ['farsi', 'persian', 'fa', 'per', 'fas'] },
  { label: 'Arabic', subdlCode: 'AR', subsourceCode: 'ar', aliases: ['arabic', 'ar', 'ara'] },
  { label: 'French', subdlCode: 'FR', subsourceCode: 'fr', aliases: ['french', 'fr', 'fra', 'fre'] },
  { label: 'Spanish', subdlCode: 'ES', subsourceCode: 'es', aliases: ['spanish', 'es', 'spa', 'esp'] },
  { label: 'Vietnamese', subdlCode: 'VI', subsourceCode: 'vi', aliases: ['vietnamese', 'vi', 'vie'] },
  
  // Alphabetical remaining languages
  { label: 'Abkhazian', subdlCode: 'AB', subsourceCode: 'ab', aliases: ['abkhazian', 'ab', 'abk'] },
  { label: 'Afrikaans', subdlCode: 'AF', subsourceCode: 'af', aliases: ['afrikaans', 'af', 'afr'] },
  { label: 'Albanian', subdlCode: 'SQ', subsourceCode: 'sq', aliases: ['albanian', 'sq', 'sqi', 'alb'] },
  { label: 'Amharic', subdlCode: 'AM', subsourceCode: 'am', aliases: ['amharic', 'am', 'amh'] },
  { label: 'Aragonese', subdlCode: 'AN', subsourceCode: 'an', aliases: ['aragonese', 'an', 'arg'] },
  { label: 'Armenian', subdlCode: 'HY', subsourceCode: 'hy', aliases: ['armenian', 'hy', 'hye', 'arm'] },
  { label: 'Assamese', subdlCode: 'AS', subsourceCode: 'as', aliases: ['assamese', 'as', 'asm'] },
  { label: 'Asturian', subdlCode: 'AST', subsourceCode: 'ast', aliases: ['asturian', 'ast'] },
  { label: 'Azerbaijani', subdlCode: 'AZ', subsourceCode: 'az', aliases: ['azerbaijani', 'az', 'aze'] },
  { label: 'Basque', subdlCode: 'EU', subsourceCode: 'eu', aliases: ['basque', 'eu', 'eus', 'baq'] },
  { label: 'Belarusian', subdlCode: 'BE', subsourceCode: 'be', aliases: ['belarusian', 'be', 'bel'] },
  { label: 'Bengali', subdlCode: 'BN', subsourceCode: 'bn', aliases: ['bengali', 'bn', 'ben'] },
  { label: 'Big 5 code', subdlCode: 'ZH', subsourceCode: 'zh', aliases: ['big 5 code', 'big5'] },
  { label: 'Bosnian', subdlCode: 'BS', subsourceCode: 'bs', aliases: ['bosnian', 'bs', 'bos'] },
  { label: 'Brazilian Portuguese', subdlCode: 'PT-BR', subsourceCode: 'pt-br', aliases: ['brazilian portuguese', 'portuguese (brazil)', 'pt-br'] },
  { label: 'Breton', subdlCode: 'BR', subsourceCode: 'br', aliases: ['breton', 'br', 'bre'] },
  { label: 'Bulgarian', subdlCode: 'BG', subsourceCode: 'bg', aliases: ['bulgarian', 'bg', 'bul'] },
  { label: 'Burmese', subdlCode: 'MY', subsourceCode: 'my', aliases: ['burmese', 'my', 'mya', 'bur'] },
  { label: 'Catalan', subdlCode: 'CA', subsourceCode: 'ca', aliases: ['catalan', 'ca', 'cat'] },
  { label: 'Chinese', subdlCode: 'ZH', subsourceCode: 'zh', aliases: ['chinese', 'zh', 'zho', 'chi'] },
  { label: 'Chinese (Cantonese)', subdlCode: 'YUE', subsourceCode: 'cantonese', aliases: ['chinese (cantonese)', 'cantonese', 'yue'] },
  { label: 'Chinese (Simplified)', subdlCode: 'ZH-HANS', subsourceCode: 'zh-hans', aliases: ['chinese (simplified)', 'simplified chinese', 'zh-hans'] },
  { label: 'Chinese (Traditional)', subdlCode: 'ZH-HANT', subsourceCode: 'zh-hant', aliases: ['chinese (traditional)', 'traditional chinese', 'zh-hant'] },
  { label: 'Chinese BG code', subdlCode: 'ZH', subsourceCode: 'zh', aliases: ['chinese bg code', 'bg code'] },
  { label: 'Chinese Bilingual', subdlCode: 'ZH', subsourceCode: 'zh', aliases: ['chinese bilingual', 'bilingual chinese'] },
  { label: 'Croatian', subdlCode: 'HR', subsourceCode: 'hr', aliases: ['croatian', 'hr', 'hrv', 'scr'] },
  { label: 'Czech', subdlCode: 'CS', subsourceCode: 'cs', aliases: ['czech', 'cs', 'ces', 'cze'] },
  { label: 'Danish', subdlCode: 'DA', subsourceCode: 'da', aliases: ['danish', 'da', 'dan'] },
  { label: 'Dari', subdlCode: 'PRS', subsourceCode: 'dar', aliases: ['dari', 'prs'] },
  { label: 'Dutch', subdlCode: 'NL', subsourceCode: 'nl', aliases: ['dutch', 'nl', 'nld', 'dut'] },
  { label: 'Esperanto', subdlCode: 'EO', subsourceCode: 'eo', aliases: ['esperanto', 'eo', 'epo'] },
  { label: 'Estonian', subdlCode: 'ET', subsourceCode: 'et', aliases: ['estonian', 'et', 'est'] },
  { label: 'Extremaduran', subdlCode: 'EXT', subsourceCode: 'ext', aliases: ['extremaduran', 'ext'] },
  { label: 'Filipino', subdlCode: 'FIL', subsourceCode: 'fil', aliases: ['filipino', 'fil', 'tl', 'tagalog'] },
  { label: 'Finnish', subdlCode: 'FI', subsourceCode: 'fi', aliases: ['finnish', 'fi', 'fin'] },
  { label: 'French (Canada)', subdlCode: 'FR-CA', subsourceCode: 'fr-ca', aliases: ['french (canada)', 'canadian french'] },
  { label: 'French (France)', subdlCode: 'FR', subsourceCode: 'fr', aliases: ['french (france)', 'fr-fr'] },
  { label: 'Gaelic', subdlCode: 'GD', subsourceCode: 'gd', aliases: ['gaelic', 'gd', 'gla'] },
  { label: 'Galician', subdlCode: 'GL', subsourceCode: 'gl', aliases: ['galician', 'gl', 'glg'] },
  { label: 'Georgian', subdlCode: 'KA', subsourceCode: 'ka', aliases: ['georgian', 'ka', 'kat', 'geo'] },
  { label: 'German', subdlCode: 'DE', subsourceCode: 'de', aliases: ['german', 'de', 'deu', 'ger'] },
  { label: 'Greek', subdlCode: 'EL', subsourceCode: 'el', aliases: ['greek', 'el', 'ell', 'gre'] },
  { label: 'Greenlandic', subdlCode: 'KL', subsourceCode: 'kl', aliases: ['greenlandic', 'kl', 'kal'] },
  { label: 'Hebrew', subdlCode: 'HE', subsourceCode: 'he', aliases: ['hebrew', 'he', 'heb'] },
  { label: 'Hindi', subdlCode: 'HI', subsourceCode: 'hi', aliases: ['hindi', 'hi', 'hin'] },
  { label: 'Hungarian', subdlCode: 'HU', subsourceCode: 'hu', aliases: ['hungarian', 'hu', 'hun'] },
  { label: 'Icelandic', subdlCode: 'IS', subsourceCode: 'is', aliases: ['icelandic', 'is', 'isl', 'ice'] },
  { label: 'Igbo', subdlCode: 'IG', subsourceCode: 'ig', aliases: ['igbo', 'ig', 'ibo'] },
  { label: 'Indonesian', subdlCode: 'ID', subsourceCode: 'id', aliases: ['indonesian', 'id', 'ind'] },
  { label: 'Interlingua', subdlCode: 'IA', subsourceCode: 'ia', aliases: ['interlingua', 'ia', 'ina'] },
  { label: 'Irish', subdlCode: 'GA', subsourceCode: 'ga', aliases: ['irish', 'ga', 'gle'] },
  { label: 'Italian', subdlCode: 'IT', subsourceCode: 'it', aliases: ['italian', 'it', 'ita'] },
  { label: 'Japanese', subdlCode: 'JA', subsourceCode: 'ja', aliases: ['japanese', 'ja', 'jpn'] },
  { label: 'Kannada', subdlCode: 'KN', subsourceCode: 'kn', aliases: ['kannada', 'kn', 'kan'] },
  { label: 'Kazakh', subdlCode: 'KK', subsourceCode: 'kk', aliases: ['kazakh', 'kk', 'kaz'] },
  { label: 'Khmer', subdlCode: 'KM', subsourceCode: 'km', aliases: ['khmer', 'km', 'khm'] },
  { label: 'Korean', subdlCode: 'KO', subsourceCode: 'ko', aliases: ['korean', 'ko', 'kor'] },
  { label: 'Kurdish', subdlCode: 'KU', subsourceCode: 'ku', aliases: ['kurdish', 'ku', 'kur'] },
  { label: 'Kyrgyz', subdlCode: 'KY', subsourceCode: 'ky', aliases: ['kyrgyz', 'ky', 'kir'] },
  { label: 'Latvian', subdlCode: 'LV', subsourceCode: 'lv', aliases: ['latvian', 'lv', 'lav'] },
  { label: 'Lithuanian', subdlCode: 'LT', subsourceCode: 'lt', aliases: ['lithuanian', 'lt', 'lit'] },
  { label: 'Luxembourgish', subdlCode: 'LB', subsourceCode: 'lb', aliases: ['luxembourgish', 'lb', 'ltz'] },
  { label: 'Macedonian', subdlCode: 'MK', subsourceCode: 'mk', aliases: ['macedonian', 'mk', 'mkd', 'mac'] },
  { label: 'Malay', subdlCode: 'MS', subsourceCode: 'ms', aliases: ['malay', 'ms', 'msa', 'may'] },
  { label: 'Malayalam', subdlCode: 'ML', subsourceCode: 'ml', aliases: ['malayalam', 'ml', 'mal'] },
  { label: 'Manipuri', subdlCode: 'MNI', subsourceCode: 'mni', aliases: ['manipuri', 'mni'] },
  { label: 'Marathi', subdlCode: 'MR', subsourceCode: 'mr', aliases: ['marathi', 'mr', 'mar'] },
  { label: 'Mongolian', subdlCode: 'MN', subsourceCode: 'mn', aliases: ['mongolian', 'mn', 'mon'] },
  { label: 'Montenegrin', subdlCode: 'CNR', subsourceCode: 'cnr', aliases: ['montenegrin', 'cnr', 'srp'] },
  { label: 'Navajo', subdlCode: 'NV', subsourceCode: 'nv', aliases: ['navajo', 'nv', 'nav'] },
  { label: 'Nepali', subdlCode: 'NE', subsourceCode: 'ne', aliases: ['nepali', 'ne', 'nep'] },
  { label: 'Northern Sami', subdlCode: 'SE', subsourceCode: 'se', aliases: ['northern sami', 'se'] },
  { label: 'Norwegian', subdlCode: 'NO', subsourceCode: 'no', aliases: ['norwegian', 'no', 'nor', 'nob', 'nno'] },
  { label: 'Occitan', subdlCode: 'OC', subsourceCode: 'oc', aliases: ['occitan', 'oc', 'oci'] },
  { label: 'Odia', subdlCode: 'OR', subsourceCode: 'or', aliases: ['odia', 'or', 'ori', 'oriya'] },
  { label: 'Pashto', subdlCode: 'PS', subsourceCode: 'ps', aliases: ['pashto', 'pushto', 'ps', 'pus'] },
  { label: 'Polish', subdlCode: 'PL', subsourceCode: 'pl', aliases: ['polish', 'pl', 'pol'] },
  { label: 'Portuguese', subdlCode: 'PT', subsourceCode: 'pt', aliases: ['portuguese', 'pt', 'por'] },
  { label: 'Pushto', subdlCode: 'PS', subsourceCode: 'ps', aliases: ['pushto', 'pashto', 'ps', 'pus'] },
  { label: 'Romanian', subdlCode: 'RO', subsourceCode: 'ro', aliases: ['romanian', 'ro', 'ron', 'rum'] },
  { label: 'Russian', subdlCode: 'RU', subsourceCode: 'ru', aliases: ['russian', 'ru', 'rus'] },
  { label: 'Santali', subdlCode: 'SAT', subsourceCode: 'sat', aliases: ['santali', 'sat'] },
  { label: 'Serbian', subdlCode: 'SR', subsourceCode: 'sr', aliases: ['serbian', 'sr', 'srp', 'scc'] },
  { label: 'Sindhi', subdlCode: 'SD', subsourceCode: 'sd', aliases: ['sindhi', 'sd', 'snd'] },
  { label: 'Sinhala', subdlCode: 'SI', subsourceCode: 'si', aliases: ['sinhala', 'sinhalese', 'si', 'sin'] },
  { label: 'Sinhalese', subdlCode: 'SI', subsourceCode: 'si', aliases: ['sinhalese', 'sinhala', 'si', 'sin'] },
  { label: 'Slovak', subdlCode: 'SK', subsourceCode: 'sk', aliases: ['slovak', 'sk', 'slk', 'slo'] },
  { label: 'Slovenian', subdlCode: 'SL', subsourceCode: 'sl', aliases: ['slovenian', 'sl', 'slv'] },
  { label: 'Somali', subdlCode: 'SO', subsourceCode: 'so', aliases: ['somali', 'so', 'som'] },
  { label: 'Sorbian', subdlCode: 'WEN', subsourceCode: 'wen', aliases: ['sorbian', 'wen'] },
  { label: 'Spanish (Latin America)', subdlCode: 'ES-419', subsourceCode: 'es-419', aliases: ['spanish (latin america)', 'latin american spanish', 'es-419'] },
  { label: 'Spanish (Spain)', subdlCode: 'ES', subsourceCode: 'es', aliases: ['spanish (spain)', 'es-es'] },
  { label: 'Swahili', subdlCode: 'SW', subsourceCode: 'sw', aliases: ['swahili', 'sw', 'swa'] },
  { label: 'Swedish', subdlCode: 'SV', subsourceCode: 'sv', aliases: ['swedish', 'sv', 'swe'] },
  { label: 'Sylheti', subdlCode: 'SYL', subsourceCode: 'syl', aliases: ['sylheti', 'syl'] },
  { label: 'Syriac', subdlCode: 'SYR', subsourceCode: 'syr', aliases: ['syriac', 'syr'] },
  { label: 'Tagalog', subdlCode: 'TL', subsourceCode: 'tl', aliases: ['tagalog', 'tl', 'fil', 'filipino'] },
  { label: 'Tamil', subdlCode: 'TA', subsourceCode: 'ta', aliases: ['tamil', 'ta', 'tam'] },
  { label: 'Tatar', subdlCode: 'TT', subsourceCode: 'tt', aliases: ['tatar', 'tt', 'tat'] },
  { label: 'Telugu', subdlCode: 'TE', subsourceCode: 'te', aliases: ['telugu', 'te', 'tel'] },
  { label: 'Tetum', subdlCode: 'TET', subsourceCode: 'tet', aliases: ['tetum', 'tet'] },
  { label: 'Thai', subdlCode: 'TH', subsourceCode: 'th', aliases: ['thai', 'th', 'tha'] },
  { label: 'Toki Pona', subdlCode: 'ART-TOKI', subsourceCode: 'toki', aliases: ['toki pona', 'toki'] },
  { label: 'Turkish', subdlCode: 'TR', subsourceCode: 'tr', aliases: ['turkish', 'tr', 'tur'] },
  { label: 'Turkmen', subdlCode: 'TK', subsourceCode: 'tk', aliases: ['turkmen', 'tk', 'tuk'] },
  { label: 'Ukrainian', subdlCode: 'UK', subsourceCode: 'uk', aliases: ['ukrainian', 'uk', 'ukr'] },
  { label: 'Urdu', subdlCode: 'UR', subsourceCode: 'ur', aliases: ['urdu', 'ur', 'urd'] },
  { label: 'Uzbek', subdlCode: 'UZ', subsourceCode: 'uz', aliases: ['uzbek', 'uz', 'uzb'] },
  { label: 'Welsh', subdlCode: 'CY', subsourceCode: 'cy', aliases: ['welsh', 'cy', 'cym', 'wel'] }
];
