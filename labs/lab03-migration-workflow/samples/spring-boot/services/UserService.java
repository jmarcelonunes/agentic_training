package com.example.demo.services;

import com.example.demo.models.User;
import com.example.demo.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }

    public List<User> findByRole(String role) {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole().equals(role))
                .collect(java.util.stream.Collectors.toList());
    }

    public boolean existsByEmail(String email) {
        return userRepository.findAll().stream()
                .anyMatch(u -> u.getEmail().equals(email));
    }
}
