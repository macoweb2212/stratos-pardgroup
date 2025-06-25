// Transforms numbers in italian words
export function numToWordsIt(numero: number): string {
    let numstr = numero.toString();
    const mono = ["", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove"];
    const duplo = [
        "dieci",
        "undici",
        "dodici",
        mono[3] + "dici",
        "quattordici",
        "quindici",
        "sedici",
        "dicias" + mono[7],
        "dici" + mono[8],
        "dician" + mono[9],
    ];
    const deca = [
        "",
        duplo[0],
        "venti",
        mono[3] + "nta",
        "quaranta",
        "cinquanta",
        "sessanta",
        "settanta",
        "ottanta",
        "novanta",
    ];
    const cento = ["cent", "cento"];
    const mili = [];
    mili[0] = ["", "mille", "milione", "miliardo", "bilione", "biliardo"];
    mili[1] = ["", "mila", "milioni", "miliardi", "bilioni", "biliardi"];
    const text = [];
    const cifra: any = [];
    let result = "";
    let sezione = 0;
    // In Javascript si fa così per dire che questo parametro e' opzionale, con valore false di default
    let centOOttanta = false;
    if (numero === 180) {
        centOOttanta = true;
    }
    numstr += "";
    // Non deve cominciare per zero altrimenti parseInt() impazzisce...
    while (numstr.substr(0, 1) == "0" && numstr.length != 1) {
        numstr = numstr.substr(1, numstr.length);
    }
    const num = parseInt(numstr);
    switch (numstr.length % 3) {
        case 1:
            numstr = "00" + numstr;
            break;
        case 2:
            numstr = "0" + numstr;
    }
    const numlen = numstr.length;
    if (isNaN(num)) {
        return "Non e' un numero!";
    } else if (num < 0) {
        return "Numero negativo!";
    } else if (numstr.length > 6 * 3) {
        return "Limite superato!";
    } else if (num == 0) {
        return "zero";
    }
    while ((sezione + 1) * 3 <= numlen) {
        const subnumerostring = numstr.substr(numlen - 1 - (sezione + 1) * 3 + 1, 3);
        if (subnumerostring != "000") {
            const subnumero = parseInt(subnumerostring);
            cifra[0] = subnumerostring[0];
            cifra[1] = subnumerostring[1];
            cifra[2] = subnumerostring[2];
            const prime2cifre = parseInt(String(cifra[1] * 10)) + parseInt(cifra[2]);
            if (prime2cifre < 10) {
                text[2] = mono[cifra[2]];
                text[1] = "";
            } else if (prime2cifre < 20) {
                text[2] = "";
                text[1] = duplo[prime2cifre - 10];
            } else {
                //	ventitre => ventitrè
                if (sezione == 0 && cifra[2] == 3) {
                    text[2] = "tre'";
                } else {
                    text[2] = mono[cifra[2]];
                }
                //	novantaotto => novantotto
                if (cifra[2] == 1 || cifra[2] == 8) {
                    text[1] = deca[cifra[1]].substr(0, deca[cifra[1]].length - 1);
                } else {
                    text[1] = deca[cifra[1]];
                }
            }
            if (cifra[0] == 0) {
                text[0] = "";
            } else {
                //	centoottanta => centottanta
                let IDcent;
                if ((!centOOttanta && cifra[1] == 8) || (cifra[1] == 0 && cifra[2] == 8)) {
                    IDcent = 0;
                } else {
                    IDcent = 1;
                }
                if (cifra[0] != 1) {
                    text[0] = mono[cifra[0]] + cento[IDcent];
                } else {
                    text[0] = cento[IDcent];
                }
            }
            //	unomille	=> mille
            //	miliardo	=> unmiliardo
            if (subnumero == 1 && sezione != 0) {
                if (sezione >= 2) {
                    result = "un" + mili[0][sezione] + result;
                } else {
                    result = mili[0][sezione] + result;
                }
            } else {
                result = text[0] + text[1] + text[2] + mili[1][sezione] + result;
            }
        }
        sezione++;
    }
    return result;
}

const unitMap: Record<string, string> = {
    kwp: "kilowatt picco",
    kwh: "kilowattora",
    kw: "kilowatt",
    hz: "hertz",
    mq: "metri quadri",
    "%": "per cento",
};

export function replaceUnitsInSentence(sentence: string) {
    return sentence.replace(
        /(\d+(?:[.,]\d+)?)(\s?)(kWh|kWp|kW|Hz|mq|%)/gi,
        (_, num, space, unit) => {
            const [intPart, decPart] = num.split(",");

            const words = `${numToWordsIt(+intPart)}`;
            // in case of decimal number add the decimal words after and than the unit. Otherwise just add the unit
            return (
                words +
                (decPart == null
                    ? ` ${unitMap[unit.toLowerCase()] || unit}`
                    : ` virgola ${numToWordsIt(decPart)} ${unitMap[unit.toLowerCase()] || unit}`)
            );

            // const unitWord = unitMap[unit.toLowerCase()] || unit;
            // return `${numToWordsIt(+num)} ${unitWord}`;
        },
    );
}

/*
normalizeEuroNumbersInText("Questa cosa costa 5.500 kWp");
→ "Questa cosa costa 5500 kWp"

normalizeEuroNumbersInText("Valore massimo: 12.345,67 euro");
→ "Valore massimo: 12345.67 euro"
 */
function normalizeEuroNumbersInText(text: string) {
    return text.replace(/\b\d{1,3}(?:\.\d{3})+(?:,\d+)?\b/g, (match) => {
        return match.replace(/\./g, "").replace(",", ".");
    });
}

function replaceNumbersWithWords(text: string): string {
    return text.replace(/\b\d+\b/g, (match) => numToWordsIt(Number(match)));
}

export function preProcessTextToRepeat(text: string) {
    let result = normalizeEuroNumbersInText(text);
    result = replaceUnitsInSentence(result);

    // Replace the remaining numbers with words
    return replaceNumbersWithWords(result);
}
