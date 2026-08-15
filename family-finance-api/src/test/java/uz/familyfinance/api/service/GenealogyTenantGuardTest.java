package uz.familyfinance.api.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.familyfinance.api.dto.response.FamilyTreeV2Response;
import uz.familyfinance.api.entity.FamilyMember;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.repository.FamilyChildRepository;
import uz.familyfinance.api.repository.FamilyMemberRepository;
import uz.familyfinance.api.repository.FamilyPartnerRepository;
import uz.familyfinance.api.repository.FamilyUnitRepository;
import uz.familyfinance.api.repository.UserRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Genealogiya tenant-guard — IDOR regressiya qulfi.
 *
 * <p><b>Nima uchun bu test bor:</b> shajara endpoint'lari {@code personId}/{@code viewer}/
 * {@code target} parametrlarini tekshirmasdan qabul qilardi. {@code FAMILY_VIEW} ruxsatiga
 * ega har qanday foydalanuvchi ID'ni almashtirib begona oilaning to'liq shajarasini —
 * ism, telefon, tug'ilgan sana va joyi, o'lim sanasi — ko'chirib olardi. ID'lar ketma-ket
 * bo'lgani uchun {@code personId=1..N} bilan butun platforma genealogiyasini yig'ish
 * mumkin edi.</p>
 *
 * <p>Guard mantiqi {@code FamilyMemberService.assertMemberAccessible} da (yagona manba);
 * bu test har bir kirish nuqtasi uni CHAQIRISHINI va 403 ni o'tkazib yubormasligini
 * qulflaydi.</p>
 *
 * <p>Toza mock'lar (Spring/DB kerak emas) → gating surefire'da ishlaydi. Uchidan-uchiga
 * (haqiqiy ikki tenant, HTTP 403) tekshiruv S1 bilan birga integration testda.</p>
 */
@DisplayName("Genealogiya tenant-guard (shajara IDOR)")
class GenealogyTenantGuardTest {

    private static final String USERNAME = "testuser";
    private static final long SELF_MEMBER_ID = 10L;
    private static final long FOREIGN_MEMBER_ID = 999L;

    private FamilyMemberRepository familyMemberRepository;
    private FamilyUnitRepository familyUnitRepository;
    private UserRepository userRepository;
    private FamilyMemberService familyMemberService;

    private TreeTraversalService treeService;
    private KinshipCalculatorService kinshipService;

    @BeforeEach
    void setUp() {
        familyMemberRepository = mock(FamilyMemberRepository.class);
        familyUnitRepository = mock(FamilyUnitRepository.class);
        userRepository = mock(UserRepository.class);
        familyMemberService = mock(FamilyMemberService.class);

        treeService = new TreeTraversalService(
                familyMemberRepository,
                familyUnitRepository,
                mock(FamilyPartnerRepository.class),
                mock(FamilyChildRepository.class),
                userRepository,
                mock(FamilyUnitService.class),
                familyMemberService);

        kinshipService = new KinshipCalculatorService(
                familyMemberRepository,
                familyUnitRepository,
                mock(FamilyPartnerRepository.class),
                mock(FamilyChildRepository.class),
                familyMemberService);

        // Joriy foydalanuvchi va uning oila a'zosi (fallback ildiz)
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(USERNAME, null, List.of()));

        User user = mock(User.class);
        when(user.getId()).thenReturn(1L);
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(user));

        // Mock'lar OLDINDAN yaratiladi — when(...) ichida mock qurish
        // UnfinishedStubbing beradi (when ichida when).
        FamilyMember selfMember = activeMember(SELF_MEMBER_ID);
        FamilyMember foreignMember = activeMember(FOREIGN_MEMBER_ID);

        when(familyMemberRepository.findByUserId(1L)).thenReturn(Optional.of(selfMember));
        when(familyMemberRepository.findById(SELF_MEMBER_ID)).thenReturn(Optional.of(selfMember));
        when(familyMemberRepository.findById(FOREIGN_MEMBER_ID))
                .thenReturn(Optional.of(foreignMember));

        // Bog'lanishsiz daraxt — BFS darhol tugaydi (guard xulqiga xalaqit bermaydi)
        when(familyUnitRepository.findByPartnerIdWithRelations(anyLong())).thenReturn(List.of());
        when(familyUnitRepository.findByChildIdWithRelations(anyLong())).thenReturn(List.of());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private FamilyMember activeMember(Long id) {
        FamilyMember member = mock(FamilyMember.class);
        when(member.getId()).thenReturn(id);
        when(member.getIsActive()).thenReturn(true);
        return member;
    }

    /** Begona shaxs uchun guard 403 tashlaydi (FamilyMemberService xulqini taqlid qiladi). */
    private void denyForeignMember() {
        doThrow(new AccessDeniedException("Siz ushbu oila a'zosini ko'rish huquqiga ega emassiz."))
                .when(familyMemberService).assertMemberAccessible(
                        argThat(
                                m -> m != null && FOREIGN_MEMBER_ID == m.getId()));
    }

    @Nested
    @DisplayName("Daraxt traversali begona tenant'ni ochmaydi")
    class TreeTraversal {

        @Test
        @DisplayName("getTree(begona personId) -> 403")
        void getTreeForeignDenied() {
            denyForeignMember();
            assertThatThrownBy(() -> treeService.getTree(FOREIGN_MEMBER_ID, 5))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("getAncestors(begona personId) -> 403")
        void getAncestorsForeignDenied() {
            denyForeignMember();
            assertThatThrownBy(() -> treeService.getAncestors(FOREIGN_MEMBER_ID))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("getDescendants(begona personId) -> 403")
        void getDescendantsForeignDenied() {
            denyForeignMember();
            assertThatThrownBy(() -> treeService.getDescendants(FOREIGN_MEMBER_ID))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("collectConnectedUnits(begona personId) -> 403 (xonadon ko'rinishi ham)")
        void collectConnectedUnitsForeignDenied() {
            denyForeignMember();
            assertThatThrownBy(() -> treeService.collectConnectedUnits(FOREIGN_MEMBER_ID, 5))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("Qarindoshlik hisoblagichi begona tenant'ni ochmaydi")
    class Kinship {

        @Test
        @DisplayName("calculateRelationship(begona viewer, ...) -> 403")
        void foreignViewerDenied() {
            denyForeignMember();
            assertThatThrownBy(
                    () -> kinshipService.calculateRelationship(FOREIGN_MEMBER_ID, SELF_MEMBER_ID))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("calculateRelationship(..., begona target) -> 403")
        void foreignTargetDenied() {
            denyForeignMember();
            assertThatThrownBy(
                    () -> kinshipService.calculateRelationship(SELF_MEMBER_ID, FOREIGN_MEMBER_ID))
                    .isInstanceOf(AccessDeniedException.class);
        }

        @Test
        @DisplayName("getLabeledTree(tree, begona viewer) -> 403")
        void foreignLabelViewerDenied() {
            denyForeignMember();
            FamilyTreeV2Response tree = new FamilyTreeV2Response();
            tree.setPersons(List.of());
            assertThatThrownBy(() -> kinshipService.getLabeledTree(tree, FOREIGN_MEMBER_ID))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("Guard normal oqimni buzmaydi")
    class NoRegression {

        @Test
        @DisplayName("O'z shaxsi bilan daraxt ochiladi va guard aynan shu a'zo uchun chaqiriladi")
        void ownTreeStillWorks() {
            doNothing().when(familyMemberService).assertMemberAccessible(
                    any());

            assertThatCode(() -> treeService.getTree(SELF_MEMBER_ID, 5)).doesNotThrowAnyException();
            verify(familyMemberService).assertMemberAccessible(
                    argThat(
                            m -> m != null && SELF_MEMBER_ID == m.getId()));
        }

        @Test
        @DisplayName("personId berilmasa o'z a'zosiga tushadi (fallback saqlanadi)")
        void nullPersonIdFallsBackToSelf() {
            doNothing().when(familyMemberService).assertMemberAccessible(
                    any());

            assertThatCode(() -> treeService.getTree(null, 5)).doesNotThrowAnyException();
            verify(familyMemberService).assertMemberAccessible(
                    argThat(
                            m -> m != null && SELF_MEMBER_ID == m.getId()));
        }
    }
}
