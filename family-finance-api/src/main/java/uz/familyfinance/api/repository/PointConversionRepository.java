package uz.familyfinance.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.familyfinance.api.entity.PointConversion;

public interface PointConversionRepository extends JpaRepository<PointConversion, Long> {

    Page<PointConversion> findByParticipantIdOrderByConversionDateDesc(Long participantId, Pageable pageable);

    Page<PointConversion> findByFamilyGroupIdOrderByConversionDateDesc(Long familyGroupId, Pageable pageable);
}
