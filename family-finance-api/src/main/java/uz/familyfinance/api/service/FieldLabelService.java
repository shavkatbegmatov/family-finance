package uz.familyfinance.api.service;

import org.springframework.stereotype.Service;
import uz.familyfinance.api.dto.response.AuditLogDetailResponse;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for mapping database field names to Uzbek labels
 * and determining field types for proper formatting.
 *
 * Faqat audit qilinadigan (Auditable) Family Finance entity'lari qamrab olinadi.
 */
@Service
public class FieldLabelService {

    private final Map<String, Map<String, String>> entityFieldLabels = new HashMap<>();
    private final Map<String, Map<String, AuditLogDetailResponse.FieldType>> entityFieldTypes = new HashMap<>();

    public FieldLabelService() {
        initializeLabels();
        initializeFieldTypes();
    }

    /**
     * Get Uzbek label for field
     */
    public String getFieldLabel(String entityType, String fieldName) {
        return entityFieldLabels
            .getOrDefault(entityType, new HashMap<>())
            .getOrDefault(fieldName, fieldName); // Fallback to field name
    }

    /**
     * Get field type for formatting
     */
    public AuditLogDetailResponse.FieldType getFieldType(String entityType, String fieldName) {
        return entityFieldTypes
            .getOrDefault(entityType, new HashMap<>())
            .getOrDefault(fieldName, AuditLogDetailResponse.FieldType.STRING); // Default
    }

    /**
     * Check if field is sensitive
     */
    public boolean isSensitiveField(String entityType, String fieldName) {
        return fieldName.equals("password") ||
               fieldName.equals("passportNumber") ||
               fieldName.equals("bankAccount") ||
               fieldName.equals("salary");
    }

    private void initializeLabels() {
        // Transaction (Tranzaksiya) labels
        Map<String, String> transactionLabels = new HashMap<>();
        transactionLabels.put("type", "Turi");
        transactionLabels.put("amount", "Summa");
        transactionLabels.put("status", "Holat");
        transactionLabels.put("transactionDate", "Sana");
        transactionLabels.put("description", "Izoh");
        transactionLabels.put("isRecurring", "Takroriy");
        transactionLabels.put("recurringPattern", "Takrorlanish davri");
        transactionLabels.put("tags", "Teglar");
        transactionLabels.put("accountId", "Hisob");
        transactionLabels.put("toAccountId", "Qabul qiluvchi hisob");
        transactionLabels.put("debitAccountId", "Debet hisob");
        transactionLabels.put("creditAccountId", "Kredit hisob");
        transactionLabels.put("categoryId", "Kategoriya");
        transactionLabels.put("familyMemberId", "Oila a'zosi");
        transactionLabels.put("originalTransactionId", "Asl tranzaksiya");
        entityFieldLabels.put("Transaction", transactionLabels);

        // Account (Hisob) labels
        Map<String, String> accountLabels = new HashMap<>();
        accountLabels.put("name", "Nomi");
        accountLabels.put("type", "Turi");
        accountLabels.put("currency", "Valyuta");
        accountLabels.put("balance", "Balans");
        accountLabels.put("openingBalance", "Boshlang'ich balans");
        accountLabels.put("accCode", "Hisob kodi");
        accountLabels.put("balanceAccountCode", "Balans hisob kodi");
        accountLabels.put("currencyCode", "Valyuta kodi");
        accountLabels.put("color", "Rang");
        accountLabels.put("icon", "Belgi");
        accountLabels.put("isActive", "Faol");
        accountLabels.put("status", "Holat");
        accountLabels.put("scope", "Ko'rinish doirasi");
        accountLabels.put("bankName", "Bank nomi");
        accountLabels.put("ownerId", "Egasi");
        accountLabels.put("familyGroupId", "Oila guruhi");
        accountLabels.put("bankId", "Bank");
        entityFieldLabels.put("Account", accountLabels);

        // Budget (Byudjet) labels
        Map<String, String> budgetLabels = new HashMap<>();
        budgetLabels.put("amount", "Summa");
        budgetLabels.put("period", "Davr");
        budgetLabels.put("startDate", "Boshlanish sanasi");
        budgetLabels.put("endDate", "Tugash sanasi");
        budgetLabels.put("isActive", "Faol");
        budgetLabels.put("categoryId", "Kategoriya");
        entityFieldLabels.put("Budget", budgetLabels);

        // Debt (Qarz) labels
        Map<String, String> debtLabels = new HashMap<>();
        debtLabels.put("type", "Turi");
        debtLabels.put("personName", "Shaxs ismi");
        debtLabels.put("personPhone", "Telefon");
        debtLabels.put("amount", "Summa");
        debtLabels.put("remainingAmount", "Qolgan summa");
        debtLabels.put("dueDate", "Muddat");
        debtLabels.put("status", "Holat");
        debtLabels.put("description", "Izoh");
        entityFieldLabels.put("Debt", debtLabels);

        // DebtPayment (Qarz to'lovi) labels
        Map<String, String> debtPaymentLabels = new HashMap<>();
        debtPaymentLabels.put("amount", "Summa");
        debtPaymentLabels.put("paymentDate", "To'lov sanasi");
        debtPaymentLabels.put("note", "Izoh");
        debtPaymentLabels.put("debtId", "Qarz");
        entityFieldLabels.put("DebtPayment", debtPaymentLabels);

        // SavingsGoal (Jamg'arma maqsadi) labels
        Map<String, String> savingsGoalLabels = new HashMap<>();
        savingsGoalLabels.put("name", "Nomi");
        savingsGoalLabels.put("targetAmount", "Maqsad summa");
        savingsGoalLabels.put("currentAmount", "Joriy summa");
        savingsGoalLabels.put("deadline", "Muddat");
        savingsGoalLabels.put("icon", "Belgi");
        savingsGoalLabels.put("color", "Rang");
        savingsGoalLabels.put("isCompleted", "Yakunlangan");
        savingsGoalLabels.put("accountId", "Hisob");
        entityFieldLabels.put("SavingsGoal", savingsGoalLabels);

        // SavingsContribution (Jamg'arma hissasi) labels
        Map<String, String> savingsContributionLabels = new HashMap<>();
        savingsContributionLabels.put("amount", "Summa");
        savingsContributionLabels.put("contributionDate", "Hissa sanasi");
        savingsContributionLabels.put("note", "Izoh");
        savingsContributionLabels.put("savingsGoalId", "Jamg'arma");
        entityFieldLabels.put("SavingsContribution", savingsContributionLabels);

        // Card (Karta) labels
        Map<String, String> cardLabels = new HashMap<>();
        cardLabels.put("cardType", "Karta turi");
        cardLabels.put("cardBin", "BIN");
        cardLabels.put("cardLastFour", "Oxirgi 4 raqam");
        cardLabels.put("cardHolderName", "Karta egasi");
        cardLabels.put("expiryDate", "Amal qilish muddati");
        cardLabels.put("isActive", "Faol");
        cardLabels.put("accountId", "Hisob");
        entityFieldLabels.put("Card", cardLabels);

        // Category (Kategoriya) labels
        Map<String, String> categoryLabels = new HashMap<>();
        categoryLabels.put("name", "Nomi");
        categoryLabels.put("type", "Turi");
        categoryLabels.put("icon", "Belgi");
        categoryLabels.put("color", "Rang");
        categoryLabels.put("isSystem", "Tizimli");
        categoryLabels.put("isActive", "Faol");
        categoryLabels.put("parentId", "Asosiy kategoriya");
        entityFieldLabels.put("Category", categoryLabels);

        // FamilyMember labels
        Map<String, String> familyMemberLabels = new HashMap<>();
        familyMemberLabels.put("firstName", "Ism");
        familyMemberLabels.put("lastName", "Familiya");
        familyMemberLabels.put("middleName", "Otasining ismi");
        familyMemberLabels.put("role", "Oiladagi roli");
        familyMemberLabels.put("gender", "Jinsi");
        familyMemberLabels.put("birthDate", "Tug'ilgan sana");
        familyMemberLabels.put("phone", "Telefon");
        familyMemberLabels.put("isActive", "Faol");
        familyMemberLabels.put("userId", "Bog'langan foydalanuvchi");
        familyMemberLabels.put("familyGroupId", "Oila guruhi");
        entityFieldLabels.put("FamilyMember", familyMemberLabels);

        // FamilyMemberLink business event labels
        Map<String, String> familyLinkLabels = new HashMap<>();
        familyLinkLabels.put("userId", "Foydalanuvchi ID");
        familyLinkLabels.put("username", "Login");
        familyLinkLabels.put("fromMemberId", "Avvalgi a'zo ID");
        familyLinkLabels.put("fromMemberName", "Avvalgi a'zo");
        familyLinkLabels.put("toMemberId", "Yangi a'zo ID");
        familyLinkLabels.put("toMemberName", "Yangi a'zo");
        familyLinkLabels.put("targetMemberPreviousUserId", "Avval bog'langan foydalanuvchi");
        familyLinkLabels.put("reason", "Sabab");
        familyLinkLabels.put("source", "Manba");
        entityFieldLabels.put("FamilyMemberLink", familyLinkLabels);

        // PointParticipantLink business event labels
        Map<String, String> pointParticipantLinkLabels = new HashMap<>();
        pointParticipantLinkLabels.put("participantId", "Ishtirokchi ID");
        pointParticipantLinkLabels.put("participantName", "Ishtirokchi");
        pointParticipantLinkLabels.put("fromMemberId", "Avvalgi a'zo ID");
        pointParticipantLinkLabels.put("fromMemberName", "Avvalgi a'zo");
        pointParticipantLinkLabels.put("toMemberId", "Yangi a'zo ID");
        pointParticipantLinkLabels.put("toMemberName", "Yangi a'zo");
        pointParticipantLinkLabels.put("targetMemberPreviousParticipantId", "Avval bog'langan ishtirokchi ID");
        pointParticipantLinkLabels.put("targetMemberPreviousParticipantName", "Avval bog'langan ishtirokchi");
        pointParticipantLinkLabels.put("reason", "Sabab");
        pointParticipantLinkLabels.put("source", "Manba");
        entityFieldLabels.put("PointParticipantLink", pointParticipantLinkLabels);
    }

    private void initializeFieldTypes() {
        // Transaction field types
        Map<String, AuditLogDetailResponse.FieldType> transactionTypes = new HashMap<>();
        transactionTypes.put("amount", AuditLogDetailResponse.FieldType.CURRENCY);
        transactionTypes.put("type", AuditLogDetailResponse.FieldType.ENUM);
        transactionTypes.put("status", AuditLogDetailResponse.FieldType.ENUM);
        transactionTypes.put("transactionDate", AuditLogDetailResponse.FieldType.DATETIME);
        transactionTypes.put("isRecurring", AuditLogDetailResponse.FieldType.BOOLEAN);
        transactionTypes.put("accountId", AuditLogDetailResponse.FieldType.NUMBER);
        transactionTypes.put("toAccountId", AuditLogDetailResponse.FieldType.NUMBER);
        transactionTypes.put("categoryId", AuditLogDetailResponse.FieldType.NUMBER);
        transactionTypes.put("familyMemberId", AuditLogDetailResponse.FieldType.NUMBER);
        entityFieldTypes.put("Transaction", transactionTypes);

        // Account field types
        Map<String, AuditLogDetailResponse.FieldType> accountTypes = new HashMap<>();
        accountTypes.put("balance", AuditLogDetailResponse.FieldType.CURRENCY);
        accountTypes.put("openingBalance", AuditLogDetailResponse.FieldType.CURRENCY);
        accountTypes.put("type", AuditLogDetailResponse.FieldType.ENUM);
        accountTypes.put("status", AuditLogDetailResponse.FieldType.ENUM);
        accountTypes.put("isActive", AuditLogDetailResponse.FieldType.BOOLEAN);
        entityFieldTypes.put("Account", accountTypes);

        // Budget field types
        Map<String, AuditLogDetailResponse.FieldType> budgetTypes = new HashMap<>();
        budgetTypes.put("amount", AuditLogDetailResponse.FieldType.CURRENCY);
        budgetTypes.put("period", AuditLogDetailResponse.FieldType.ENUM);
        budgetTypes.put("startDate", AuditLogDetailResponse.FieldType.DATE);
        budgetTypes.put("endDate", AuditLogDetailResponse.FieldType.DATE);
        budgetTypes.put("isActive", AuditLogDetailResponse.FieldType.BOOLEAN);
        entityFieldTypes.put("Budget", budgetTypes);

        // Debt field types
        Map<String, AuditLogDetailResponse.FieldType> debtTypes = new HashMap<>();
        debtTypes.put("amount", AuditLogDetailResponse.FieldType.CURRENCY);
        debtTypes.put("remainingAmount", AuditLogDetailResponse.FieldType.CURRENCY);
        debtTypes.put("type", AuditLogDetailResponse.FieldType.ENUM);
        debtTypes.put("status", AuditLogDetailResponse.FieldType.ENUM);
        debtTypes.put("dueDate", AuditLogDetailResponse.FieldType.DATE);
        entityFieldTypes.put("Debt", debtTypes);

        // DebtPayment field types
        Map<String, AuditLogDetailResponse.FieldType> debtPaymentTypes = new HashMap<>();
        debtPaymentTypes.put("amount", AuditLogDetailResponse.FieldType.CURRENCY);
        debtPaymentTypes.put("paymentDate", AuditLogDetailResponse.FieldType.DATE);
        entityFieldTypes.put("DebtPayment", debtPaymentTypes);

        // SavingsGoal field types
        Map<String, AuditLogDetailResponse.FieldType> savingsGoalTypes = new HashMap<>();
        savingsGoalTypes.put("targetAmount", AuditLogDetailResponse.FieldType.CURRENCY);
        savingsGoalTypes.put("currentAmount", AuditLogDetailResponse.FieldType.CURRENCY);
        savingsGoalTypes.put("deadline", AuditLogDetailResponse.FieldType.DATE);
        savingsGoalTypes.put("isCompleted", AuditLogDetailResponse.FieldType.BOOLEAN);
        entityFieldTypes.put("SavingsGoal", savingsGoalTypes);

        // SavingsContribution field types
        Map<String, AuditLogDetailResponse.FieldType> savingsContributionTypes = new HashMap<>();
        savingsContributionTypes.put("amount", AuditLogDetailResponse.FieldType.CURRENCY);
        savingsContributionTypes.put("contributionDate", AuditLogDetailResponse.FieldType.DATE);
        entityFieldTypes.put("SavingsContribution", savingsContributionTypes);

        // Card field types
        Map<String, AuditLogDetailResponse.FieldType> cardTypes = new HashMap<>();
        cardTypes.put("cardType", AuditLogDetailResponse.FieldType.ENUM);
        cardTypes.put("isActive", AuditLogDetailResponse.FieldType.BOOLEAN);
        entityFieldTypes.put("Card", cardTypes);

        // Category field types
        Map<String, AuditLogDetailResponse.FieldType> categoryTypes = new HashMap<>();
        categoryTypes.put("type", AuditLogDetailResponse.FieldType.ENUM);
        categoryTypes.put("isSystem", AuditLogDetailResponse.FieldType.BOOLEAN);
        categoryTypes.put("isActive", AuditLogDetailResponse.FieldType.BOOLEAN);
        entityFieldTypes.put("Category", categoryTypes);

        // FamilyMember field types
        Map<String, AuditLogDetailResponse.FieldType> familyMemberTypes = new HashMap<>();
        familyMemberTypes.put("role", AuditLogDetailResponse.FieldType.ENUM);
        familyMemberTypes.put("gender", AuditLogDetailResponse.FieldType.ENUM);
        familyMemberTypes.put("birthDate", AuditLogDetailResponse.FieldType.DATE);
        familyMemberTypes.put("deathDate", AuditLogDetailResponse.FieldType.DATE);
        familyMemberTypes.put("isActive", AuditLogDetailResponse.FieldType.BOOLEAN);
        familyMemberTypes.put("userId", AuditLogDetailResponse.FieldType.NUMBER);
        familyMemberTypes.put("familyGroupId", AuditLogDetailResponse.FieldType.NUMBER);
        entityFieldTypes.put("FamilyMember", familyMemberTypes);

        // FamilyMemberLink field types
        Map<String, AuditLogDetailResponse.FieldType> familyLinkTypes = new HashMap<>();
        familyLinkTypes.put("userId", AuditLogDetailResponse.FieldType.NUMBER);
        familyLinkTypes.put("fromMemberId", AuditLogDetailResponse.FieldType.NUMBER);
        familyLinkTypes.put("toMemberId", AuditLogDetailResponse.FieldType.NUMBER);
        familyLinkTypes.put("targetMemberPreviousUserId", AuditLogDetailResponse.FieldType.NUMBER);
        familyLinkTypes.put("reason", AuditLogDetailResponse.FieldType.STRING);
        entityFieldTypes.put("FamilyMemberLink", familyLinkTypes);

        // PointParticipantLink field types
        Map<String, AuditLogDetailResponse.FieldType> pointParticipantLinkTypes = new HashMap<>();
        pointParticipantLinkTypes.put("participantId", AuditLogDetailResponse.FieldType.NUMBER);
        pointParticipantLinkTypes.put("fromMemberId", AuditLogDetailResponse.FieldType.NUMBER);
        pointParticipantLinkTypes.put("toMemberId", AuditLogDetailResponse.FieldType.NUMBER);
        pointParticipantLinkTypes.put("targetMemberPreviousParticipantId", AuditLogDetailResponse.FieldType.NUMBER);
        pointParticipantLinkTypes.put("reason", AuditLogDetailResponse.FieldType.STRING);
        entityFieldTypes.put("PointParticipantLink", pointParticipantLinkTypes);
    }
}
