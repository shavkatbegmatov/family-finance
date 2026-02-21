package uz.familyfinance.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.familyfinance.api.entity.User;
import uz.familyfinance.api.repository.UserRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DebugController {
    private final UserRepository userRepository;

    @GetMapping("/debug/user-groups")
    public ResponseEntity<Map<String, Object>> checkGroups() {
        Map<String, Object> result = new HashMap<>();
        userRepository.findAll().forEach(u -> {
            Map<String, Object> info = new HashMap<>();
            info.put("id", u.getId());
            info.put("username", u.getUsername());
            info.put("familyGroupId", u.getFamilyGroup() != null ? u.getFamilyGroup().getId() : null);
            result.put(u.getUsername(), info);
        });
        return ResponseEntity.ok(result);
    }
}
