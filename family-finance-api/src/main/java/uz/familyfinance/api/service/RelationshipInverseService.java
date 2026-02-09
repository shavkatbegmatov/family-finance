package uz.familyfinance.api.service;

import org.springframework.stereotype.Service;
import uz.familyfinance.api.enums.Gender;
import uz.familyfinance.api.enums.RelationshipType;

@Service
public class RelationshipInverseService {

    public RelationshipType computeInverse(RelationshipType type, Gender fromGender) {
        boolean isMale = fromGender == Gender.MALE;

        return switch (type) {
            case OTA, ONA -> isMale ? RelationshipType.OGIL : RelationshipType.QIZ;
            case OGIL, QIZ -> isMale ? RelationshipType.OTA : RelationshipType.ONA;
            case ER -> RelationshipType.XOTIN;
            case XOTIN -> RelationshipType.ER;
            case AKA -> isMale ? RelationshipType.UKA : RelationshipType.SINGIL;
            case UKA -> isMale ? RelationshipType.AKA : RelationshipType.OPA;
            case OPA -> isMale ? RelationshipType.UKA : RelationshipType.SINGIL;
            case SINGIL -> isMale ? RelationshipType.AKA : RelationshipType.OPA;
            case BOBO, BUVI -> isMale ? RelationshipType.NEVARA_OGIL : RelationshipType.NEVARA_QIZ;
            case NEVARA_OGIL, NEVARA_QIZ -> isMale ? RelationshipType.BOBO : RelationshipType.BUVI;
            case AMAKI, TOGHA, AMMA, XOLA -> isMale ? RelationshipType.JIYAN_OGIL : RelationshipType.JIYAN_QIZ;
            case JIYAN_OGIL, JIYAN_QIZ -> isMale ? RelationshipType.AMAKI : RelationshipType.AMMA;
            case KUYOV, KELIN -> isMale ? RelationshipType.QAYIN_OTA : RelationshipType.QAYIN_ONA;
            case QAYIN_OTA, QAYIN_ONA -> isMale ? RelationshipType.KUYOV : RelationshipType.KELIN;
            case BOSHQA -> RelationshipType.BOSHQA;
        };
    }

    public Gender inferTargetGender(RelationshipType type) {
        return switch (type) {
            case OTA, AKA, UKA, BOBO, AMAKI, TOGHA, ER, KUYOV, QAYIN_OTA, OGIL, NEVARA_OGIL, JIYAN_OGIL -> Gender.MALE;
            case ONA, OPA, SINGIL, BUVI, AMMA, XOLA, XOTIN, KELIN, QAYIN_ONA, QIZ, NEVARA_QIZ, JIYAN_QIZ -> Gender.FEMALE;
            case BOSHQA -> null;
        };
    }
}
