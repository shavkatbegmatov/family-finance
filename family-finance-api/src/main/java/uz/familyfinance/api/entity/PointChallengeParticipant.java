package uz.familyfinance.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.familyfinance.api.entity.base.BaseEntity;

@Entity
@Table(name = "point_challenge_participants", uniqueConstraints = {
    @UniqueConstraint(name = "uk_challenge_participant",
        columnNames = {"challenge_id", "participant_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointChallengeParticipant extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenge_id", nullable = false)
    private PointChallenge challenge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private PointParticipant participant;

    @Column(nullable = false)
    @Builder.Default
    private Integer score = 0;

    @Column(name = "rank")
    private Integer rank;
}
