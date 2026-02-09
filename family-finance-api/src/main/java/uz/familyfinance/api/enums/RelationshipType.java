package uz.familyfinance.api.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RelationshipType {

    OTA("Otam", "parents"),
    ONA("Onam", "parents"),
    OGIL("O'g'lim", "children"),
    QIZ("Qizim", "children"),
    ER("Erim", "spouse"),
    XOTIN("Xotinim", "spouse"),
    AKA("Akam", "siblings"),
    UKA("Ukam", "siblings"),
    OPA("Opam", "siblings"),
    SINGIL("Singlim", "siblings"),
    BOBO("Bobom", "grandparents"),
    BUVI("Buvim", "grandparents"),
    NEVARA_OGIL("Nevaram (o'g'il)", "grandchildren"),
    NEVARA_QIZ("Nevaram (qiz)", "grandchildren"),
    AMAKI("Ammakim", "extended"),
    TOGHA("Tog'am", "extended"),
    AMMA("Ammam", "extended"),
    XOLA("Xolam", "extended"),
    JIYAN_OGIL("Jiyanim (o'g'il)", "extended"),
    JIYAN_QIZ("Jiyanim (qiz)", "extended"),
    KUYOV("Kuyovim", "in-laws"),
    KELIN("Kelinim", "in-laws"),
    QAYIN_OTA("Qayin otam", "in-laws"),
    QAYIN_ONA("Qayin onam", "in-laws"),
    BOSHQA("Boshqa", "other");

    private final String label;
    private final String category;
}
