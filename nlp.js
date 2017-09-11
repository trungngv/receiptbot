var request = require('request-promise');
const abnRegex = /(ABN:?|A\.B\.N:?)\s?([\d ]+)/;
const totalRegex = /(subtotal|total|purchase)\s+\$?(\d+\.\d\d)/i;
const itemRegex = /([a-z][-\w\s]+)\s\$?(\d+\.\d\d)/ig;
const notPurchaseItemRegex = /total|eft|debit|credit/i;
const organisationRegex = /<mainName>\r\n\s+<organisationName>(.*)<\/organisationName>/;
const testDocument = 'BIG W ROCKDALE PHONE (02) 9308 7310 TAX INVOICE - ABN 88 000 014 675 to */KEYS 6071677 OUTLET PLUG W 3.00 *7895487 WOOD DOOR BARRIER 39.00 * 7459665 AFF PVC HANGR 12PK Qty2 $3.00 eaf 6.00 - BIG W ROCKDALE 0146 NSW MERCH ID: 611000602000146 TERM ID : W0146095 CARD: 1203 T CBA Debit CREDIT A0000000041010 AROCF128141A038B3780 PURCHASE $48.00 AID TOTAL $48.00 APPROVED 00 07/03/15 17:21 000281 TOTAL FOR 4 ITEHS $48.00 EFT $48.00 $0.00 CHANGE * Taxable Items TOTAL includes GST $4.36 You have earned at least 9 Qantas Frequent flyer points for this sale - - - - 2401460950281070320152 as 0995 17:22 7/03/15';
const util = require('util');
const ABR_GUID = 'da74235d-99c6-484e-bf6e-0f72d28e8523';

/**
 * Extract key information from a document detected from receipt. This is an experimental implementation
 * and only works for simple receipts matching the assumed pattern.
 * 
 * @param {string} s receipt 
 */
function extractReceiptInformation(s) {
    // Can improve by searching for all items that sum to total purchase 
    // Receipt can be Description, Qty, Amount vs. Amount, Qty, Description etc
    var matched = s.match(abnRegex);
    var itemsFirstIdx = 0, itemsLastIdx = s.length;
    var receipt = {}
    if (matched) {
        var abn = matched[2].replace(/ /g, '');
        if (abn.length >= 11) {
            receipt['abn'] = abn.substring(0, 11);
            itemsFirstIdx = matched.index;
        }
    }
     
    matched = s.match(totalRegex);
    if (matched) {
        receipt['total'] = parseFloat(matched[2]);
        itemsLastIdx = matched.index;
        console.log('last idx %d', itemsLastIdx);
    }

    // TODO: match items between ABN and Total
    var itemsString = s.substring(itemsFirstIdx, itemsLastIdx);
    receipt['items'] = [];
    while ((matched = itemRegex.exec(itemsString)) != null) {
        // matches that are not purchase item
        if (!notPurchaseItemRegex.test(matched[1])) {
            receipt.items.push({item: matched[1], price: parseFloat(matched[2])});
        }
    }
    return receipt;
}

/**
 * Retrieves organisation name for the given ABN using ABR service.
 * 
 * @param {string} abn 
 */
function getOrganisationName(abn) {
    return new Promise(function (resolve, reject) {
        var url = util.format(
            'https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/SearchByABNv201408?searchString=%s&includeHistoricalDetails=N&authenticationGuid=%s',
            abn, ABR_GUID
        );
        request(url).then(response => {
            var result = response.match(organisationRegex);
            resolve(result[1]);
        }).catch(error => {
            reject(error);
        });
    });
}

var exports = module.exports = {
    extractReceiptInformation: extractReceiptInformation,
    getOrganisationName: getOrganisationName
}